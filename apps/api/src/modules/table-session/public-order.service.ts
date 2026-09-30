import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@dio-sys-be/db";
import { AppError } from "../../common/errors/app-error";
import { SessionEventsService } from "../../common/realtime/session-events.service";
import { type GuestContext, signGuestToken } from "../../common/utils/guest-token";
import { DRIZZLE } from "../../database/database.module";
import { CategoryRepository } from "../category/category.repository";
import { MenuRepository } from "../menu/menu.repository";
import { TableRepository } from "../table/table.repository";
import { TenantRepository } from "../tenant/tenant.repository";
import { BillService } from "./bill.service";
import {
  type ServiceRequestType,
  TableSessionRepository,
  type TableSessionRow,
} from "./table-session.repository";
import type { CreateSessionOrderInput } from "./table-session.schema";

/** One request per type per session in this window (anti-spam). */
const SERVICE_REQUEST_COOLDOWN_MS = 60 * 1000;

const isUniqueViolation = (error: unknown) => {
  const e = error as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
};

@Injectable()
export class PublicOrderService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly repo: TableSessionRepository,
    private readonly bills: BillService,
    private readonly tableRepo: TableRepository,
    private readonly tenantRepo: TenantRepository,
    private readonly categoryRepo: CategoryRepository,
    private readonly menuRepo: MenuRepository,
    private readonly events: SessionEventsService,
  ) {}

  /**
   * Scan entry point. Joins the table's live session or opens one, and issues
   * a guest token for this device. The partial unique index makes concurrent
   * first scans converge on a single session.
   */
  async openSession(qrToken: string) {
    const table = await this.repo.findTableByQrToken(qrToken);
    if (!table) {
      throw new AppError(
        "QR meja tidak valid. Minta bantuan pelayan untuk memindai ulang.",
        404,
        { code: "INVALID_TABLE_TOKEN" },
      );
    }
    const tenant = await this.tenantRepo.findTenantById(table.tenantId);
    if (!tenant) throw new AppError("Restaurant not found", 404);

    const { session, opened } = await this.repo.findOrOpenSession(table);
    if (!opened) await this.bills.expireStalePayment(session.id);

    const guestToken = await signGuestToken({
      sessionId: session.id,
      tableId: table.id,
      tenantId: table.tenantId,
    });

    return {
      guestToken,
      sessionId: session.id,
      table: { id: table.id, name: table.name },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        tagline: tenant.tagline,
        isOpen: tenant.isOpen,
      },
    };
  }

  /** Categories + items for the tenant, including sold-out items (flagged). */
  async getMenu(tenantId: string) {
    const tenant = await this.tenantRepo.findTenantById(tenantId);
    if (!tenant) throw new AppError("Restaurant not found", 404);

    const [categories, items] = await Promise.all([
      this.categoryRepo.findCategoriesByTenantId(tenantId),
      this.repo.findPublicMenus(tenantId),
    ]);
    const usedCategoryIds = new Set(items.map((item) => item.categoryId));

    return {
      categories: categories
        .filter((c) => usedCategoryIds.has(c.id))
        .map((c) => ({ id: c.id, name: c.name }))
        .sort((a, b) => a.name.localeCompare(b.name, "id")),
      items,
    };
  }

  /** Everything the guest screens need about the session in one call. */
  async getSessionView(guest: GuestContext) {
    await this.bills.expireStalePayment(guest.sessionId);

    const session = await this.requireSession(guest);
    const [table, tenant, orders, bill, recentRequests] = await Promise.all([
      this.tableRepo.findTableById(session.tableId),
      this.tenantRepo.findTenantById(session.tenantId),
      this.repo.findSessionOrders(session.id),
      this.bills.getBillView(session.id),
      this.repo.findSessionServiceRequests(
        session.id,
        new Date(Date.now() - SERVICE_REQUEST_COOLDOWN_MS),
      ),
    ]);

    const cooldowns: Partial<Record<ServiceRequestType, string>> = {};
    for (const request of recentRequests) {
      if (cooldowns[request.type]) continue;
      cooldowns[request.type] = new Date(
        request.createdAt.getTime() + SERVICE_REQUEST_COOLDOWN_MS,
      ).toISOString();
    }

    return {
      session: {
        id: session.id,
        status: session.status,
        openedAt: session.openedAt,
        closedAt: session.closedAt,
      },
      table: table && { id: table.id, name: table.name },
      tenant: tenant && {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        tagline: tenant.tagline,
        isOpen: tenant.isOpen,
      },
      orders: orders.map(({ tenantId: _t, tableId: _tb, transactionId, ...order }) => ({
        ...order,
        isPaid: !!transactionId,
      })),
      bill,
      serviceCooldowns: cooldowns,
    };
  }

  /**
   * Submits one round of the guest's cart. The server re-prices every line from
   * the catalog; client prices are only used to detect a stale menu.
   */
  async createOrder(
    guest: GuestContext,
    input: CreateSessionOrderInput,
    idempotencyKey: string | undefined,
  ) {
    if (!idempotencyKey || idempotencyKey.length > 100) {
      throw new AppError("Idempotency-Key header is required", 400);
    }

    const replay = await this.repo.findOrderByIdempotencyKey(
      guest.sessionId,
      idempotencyKey,
    );
    if (replay) return await this.orderView(guest.sessionId, replay.id);

    const session = await this.requireSession(guest);
    this.assertSessionAcceptsOrders(session);

    const tenant = await this.tenantRepo.findTenantById(session.tenantId);
    if (!tenant?.isOpen) {
      throw new AppError("Dapur sedang tutup. Pesanan belum bisa dikirim.", 409, {
        code: "KITCHEN_CLOSED",
      });
    }

    const menuIds = [...new Set(input.lines.map((line) => line.menuId))];
    const menus = await this.menuRepo.findMenusByIds(menuIds);
    const menuById = new Map(menus.map((m) => [m.id, m]));

    const unavailable: { menuId: string; name?: string }[] = [];
    const priceChanged: { menuId: string; name: string; price: number }[] = [];
    for (const line of input.lines) {
      const menu = menuById.get(line.menuId);
      if (!menu || menu.tenantId !== session.tenantId || !menu.isAvailable) {
        unavailable.push({ menuId: line.menuId, name: menu?.name });
        continue;
      }
      if (line.unitPrice !== undefined && line.unitPrice !== menu.price) {
        priceChanged.push({ menuId: menu.id, name: menu.name, price: menu.price });
      }
    }
    if (unavailable.length > 0) {
      throw new AppError("Beberapa menu sudah habis", 422, {
        code: "ITEM_UNAVAILABLE",
        details: { lines: unavailable },
      });
    }
    if (priceChanged.length > 0) {
      throw new AppError("Harga beberapa menu berubah", 422, {
        code: "PRICE_CHANGED",
        details: { lines: priceChanged },
      });
    }

    const items = input.lines.map((line) => ({
      menuId: line.menuId,
      quantity: line.quantity,
      price: menuById.get(line.menuId)!.price,
      note: line.note || null,
    }));
    const totalPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    let orderId: string;
    try {
      orderId = await this.db.transaction(async (tx) => {
        // Re-check under the row lock: the bill may have been locked meanwhile.
        const locked = await this.repo.lockSession(session.id, tx);
        this.assertSessionAcceptsOrders(locked!);
        const order = await this.repo.createSessionOrder(
          {
            tenantId: session.tenantId,
            tableId: session.tableId,
            sessionId: session.id,
            totalPrice,
            note: input.note || null,
            idempotencyKey,
          },
          items,
          tx,
        );
        return order.id;
      });
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // Lost a race with the same key: return the order that won.
      const winner = await this.repo.findOrderByIdempotencyKey(
        guest.sessionId,
        idempotencyKey,
      );
      if (!winner) throw error;
      orderId = winner.id;
    }

    this.events.emit({
      type: "order.updated",
      tenantId: session.tenantId,
      sessionId: session.id,
      data: { orderId },
    });
    return await this.orderView(session.id, orderId);
  }

  /** Guests may withdraw a round only before the kitchen accepts it. */
  async cancelOrder(guest: GuestContext, orderId: string) {
    const order = await this.repo.findOrderById(orderId);
    if (!order || order.sessionId !== guest.sessionId) {
      throw new AppError("Pesanan tidak ditemukan", 404);
    }
    const session = await this.requireSession(guest);
    this.assertSessionAcceptsOrders(session);
    if (order.status !== "NEW") {
      throw new AppError("Pesanan sudah diproses dapur dan tidak bisa dibatalkan", 409, {
        code: "ORDER_NOT_CANCELLABLE",
      });
    }
    await this.repo.updateOrderStatus(order.id, "CANCELED");
    this.events.emit({
      type: "order.updated",
      tenantId: order.tenantId,
      sessionId: guest.sessionId,
      data: { orderId },
    });
    return await this.orderView(guest.sessionId, orderId);
  }

  async lockBill(guest: GuestContext, method: "online" | "cashier") {
    await this.requireSession(guest);
    await this.bills.lock(guest.sessionId, method);
    return await this.bills.getBillView(guest.sessionId);
  }

  /**
   * Starts paying a locked bill. `online` returns a Snap token; `cashier`
   * queues a "bill" service request so staff come to the table.
   */
  async createPayment(
    guest: GuestContext,
    billId: string,
    method: "online" | "cashier",
  ) {
    const bill = await this.requireBill(guest, billId);
    if (bill.status === "paid") {
      throw new AppError("Tagihan sudah dibayar", 409, { code: "BILL_PAID" });
    }
    if (bill.status !== "locked") {
      throw new AppError("Tagihan belum dikunci untuk pembayaran", 409, {
        code: "BILL_NOT_LOCKED",
      });
    }

    if (method === "cashier") {
      if (bill.paymentMethod !== "cashier") {
        await this.repo.updateBill(bill.id, { paymentMethod: "cashier" });
      }
      const recent = await this.repo.findRecentServiceRequest(
        guest.sessionId,
        "bill",
        new Date(Date.now() - SERVICE_REQUEST_COOLDOWN_MS),
      );
      if (!recent) await this.createServiceRequestRow(guest, "bill");
      return { method, payment: null, bill: await this.bills.getBillView(guest.sessionId) };
    }

    if (bill.paymentMethod !== "online") {
      await this.repo.updateBill(bill.id, { paymentMethod: "online" });
    }
    const payment = await this.bills.createOnlinePayment({
      ...bill,
      paymentMethod: "online",
    });
    return {
      method,
      payment: this.bills.toPaymentView(payment),
      bill: await this.bills.getBillView(guest.sessionId),
    };
  }

  /** Guest backs out of paying: the bill unlocks and ordering resumes. */
  async cancelPayment(guest: GuestContext, billId: string) {
    const bill = await this.requireBill(guest, billId);
    if (bill.status === "locked") await this.bills.unlock(bill.id, "cancelled");
    return await this.bills.getBillView(guest.sessionId);
  }

  /**
   * Payment status for polling. A pending payment is reconciled against
   * Midtrans, so a missed webhook is recovered while the guest waits.
   * The client never marks anything paid by itself.
   */
  async getPayment(guest: GuestContext, paymentId: string) {
    const payment = await this.repo.findPaymentRequestById(paymentId);
    if (!payment?.billId) throw new AppError("Pembayaran tidak ditemukan", 404);
    await this.requireBill(guest, payment.billId);

    if (payment.status === "pending") await this.bills.reconcile(payment);
    const fresh = await this.repo.findPaymentRequestById(paymentId);
    return {
      payment: this.bills.toPaymentView(fresh!),
      bill: await this.bills.getBillView(guest.sessionId),
    };
  }

  async createServiceRequest(guest: GuestContext, type: ServiceRequestType) {
    const session = await this.requireSession(guest);
    if (session.status === "closed") {
      throw new AppError("Sesi meja sudah selesai", 409, { code: "SESSION_CLOSED" });
    }

    const recent = await this.repo.findRecentServiceRequest(
      session.id,
      type,
      new Date(Date.now() - SERVICE_REQUEST_COOLDOWN_MS),
    );
    if (recent) {
      const retryAt = new Date(recent.createdAt.getTime() + SERVICE_REQUEST_COOLDOWN_MS);
      throw new AppError("Permintaan sudah dikirim. Mohon tunggu sebentar.", 429, {
        code: "SERVICE_REQUEST_COOLDOWN",
        details: { retryAt: retryAt.toISOString() },
      });
    }

    const request = await this.createServiceRequestRow(guest, type);
    return {
      id: request.id,
      type: request.type,
      createdAt: request.createdAt,
      retryAt: new Date(
        request.createdAt.getTime() + SERVICE_REQUEST_COOLDOWN_MS,
      ).toISOString(),
    };
  }

  // ── helpers ─────────────────────────────────────────────────────────────────

  private async createServiceRequestRow(guest: GuestContext, type: ServiceRequestType) {
    const request = await this.repo.createServiceRequest({
      tenantId: guest.tenantId,
      sessionId: guest.sessionId,
      tableId: guest.tableId,
      type,
    });
    this.events.emit({
      type: "service_request.created",
      tenantId: guest.tenantId,
      sessionId: guest.sessionId,
      data: { requestId: request.id, type },
    });
    return request;
  }

  private async requireSession(guest: GuestContext) {
    const session = await this.repo.findSessionById(guest.sessionId);
    if (!session) {
      throw new AppError("Sesi meja tidak ditemukan", 404, { code: "SESSION_NOT_FOUND" });
    }
    return session;
  }

  private async requireBill(guest: GuestContext, billId: string) {
    const bill = await this.repo.findBillById(billId);
    if (!bill || bill.sessionId !== guest.sessionId) {
      throw new AppError("Tagihan tidak ditemukan", 404);
    }
    return bill;
  }

  private assertSessionAcceptsOrders(session: TableSessionRow) {
    if (session.status === "billing") {
      throw new AppError(
        "Tagihan sedang dibayar. Batalkan pembayaran untuk menambah pesanan.",
        409,
        { code: "BILL_LOCKED" },
      );
    }
    if (session.status !== "open") {
      throw new AppError("Sesi meja sudah selesai. Pindai ulang QR meja.", 409, {
        code: "SESSION_NOT_OPEN",
      });
    }
  }

  private async orderView(sessionId: string, orderId: string) {
    const orders = await this.repo.findSessionOrders(sessionId);
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new AppError("Pesanan tidak ditemukan", 404);
    const { tenantId: _t, tableId: _tb, transactionId, ...rest } = order;
    return { ...rest, isPaid: !!transactionId };
  }
}
