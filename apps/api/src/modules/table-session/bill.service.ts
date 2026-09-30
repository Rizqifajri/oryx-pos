import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Db } from "@dio-sys-be/db";
import { env } from "@dio-sys-be/env/server";
import { AppError } from "../../common/errors/app-error";
import { SessionEventsService } from "../../common/realtime/session-events.service";
import {
  computeBillTotals,
  computePriceBreakdown,
} from "../../common/utils/pricing";
import { DRIZZLE } from "../../database/database.module";
import { coreApiClient, snapClient } from "../payment/payment.config";
import { TableRepository } from "../table/table.repository";
import { TenantRepository } from "../tenant/tenant.repository";
import { TransactionRepository } from "../transaction/transaction.repository";
import {
  type BillRow,
  TableSessionRepository,
} from "./table-session.repository";

/** How long a guest has to finish an online payment before the bill unlocks. */
const ONLINE_PAYMENT_TTL_MS = 15 * 60 * 1000;

type PaymentRequestRow = NonNullable<
  Awaited<ReturnType<TableSessionRepository["findPaymentRequestById"]>>
>;

export type ProviderPaymentStatus = "pending" | "success" | "failed" | "expired";

/**
 * Table bill lifecycle: open (live preview) → locked (totals frozen, ordering
 * blocked, payment in progress) → paid (Transactions recorded, session closed,
 * table freed). Every transition happens here, inside a DB transaction that
 * holds the bill/session row lock.
 */
@Injectable()
export class BillService {
  private readonly logger = new Logger(BillService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly repo: TableSessionRepository,
    private readonly tableRepo: TableRepository,
    private readonly tenantRepo: TenantRepository,
    private readonly transactionRepo: TransactionRepository,
    private readonly events: SessionEventsService,
  ) {}

  /**
   * The bill as the guest/staff should see it: frozen totals when locked or
   * paid, otherwise a live preview computed from the session's orders.
   */
  async getBillView(sessionId: string) {
    const [bill, orders] = await Promise.all([
      this.repo.findBillBySession(sessionId),
      this.repo.findSessionOrders(sessionId),
    ]);

    const payment = bill ? await this.repo.findLatestBillPayment(bill.id) : null;

    if (bill && bill.status !== "open") {
      return {
        id: bill.id,
        status: bill.status,
        subtotal: bill.subtotal,
        taxAmount: bill.taxAmount,
        serviceAmount: bill.serviceAmount,
        totalAmount: bill.totalAmount,
        paymentMethod: bill.paymentMethod,
        lockedAt: bill.lockedAt,
        paidAt: bill.paidAt,
        payment: payment && this.toPaymentView(payment),
      };
    }

    return {
      id: bill?.id ?? null,
      status: "open" as const,
      ...computeBillTotals(orders),
      paymentMethod: null,
      lockedAt: null,
      paidAt: null,
      payment: null,
    };
  }

  toPaymentView(payment: PaymentRequestRow) {
    return {
      id: payment.id,
      status: payment.status,
      amount: payment.amount,
      snapToken: payment.status === "pending" ? payment.snapToken : null,
      snapRedirectUrl:
        payment.status === "pending" ? payment.snapRedirectUrl : null,
      expiresAt: payment.expiresAt,
      paymentType: payment.paymentType,
    };
  }

  /**
   * Freezes the bill for payment and moves the session to `billing`, which
   * blocks new orders. Idempotent: locking an already-locked bill returns it.
   */
  async lock(sessionId: string, method: "online" | "cashier") {
    const bill = await this.db.transaction(async (tx) => {
      const session = await this.repo.lockSession(sessionId, tx);
      if (!session) throw new AppError("Session not found", 404);
      if (session.status === "closed") {
        throw new AppError("Sesi meja sudah selesai", 409, {
          code: "SESSION_CLOSED",
        });
      }

      const existing = await this.repo.findBillBySession(sessionId, tx);
      if (existing?.status === "paid") {
        throw new AppError("Tagihan sudah dibayar", 409, { code: "BILL_PAID" });
      }
      if (session.status === "billing" && existing?.status === "locked") {
        if (existing.paymentMethod === method) return existing;
        return await this.repo.updateBill(
          existing.id,
          { paymentMethod: method },
          tx,
        );
      }

      const orders = await this.repo.findSessionOrders(sessionId, tx);
      const totals = computeBillTotals(orders);
      if (totals.totalAmount <= 0) {
        throw new AppError("Belum ada pesanan untuk dibayar", 409, {
          code: "NO_ORDERS",
        });
      }

      const locked = await this.repo.upsertBill(
        {
          tenantId: session.tenantId,
          sessionId,
          status: "locked",
          ...totals,
          paymentMethod: method,
          lockedAt: new Date(),
          paidAt: null,
        },
        tx,
      );
      await this.repo.updateSession(sessionId, { status: "billing" }, tx);
      return locked;
    });

    this.emitBill(bill!, "bill.updated");
    return bill!;
  }

  /**
   * Returns a locked bill to `open` (payment cancelled, failed or expired) and
   * lets the session order again. Pending payment requests are closed out so a
   * stale Snap token cannot be reused.
   */
  async unlock(billId: string, reason: "cancelled" | "expired" | "failed") {
    const bill = await this.db.transaction(async (tx) => {
      const bill = await this.repo.lockBill(billId, tx);
      if (!bill || bill.status !== "locked") return null;

      const pending = await this.repo.findPendingBillPayments(billId, tx);
      for (const payment of pending) {
        await this.repo.setPaymentRequestStatus(
          payment.id,
          reason === "expired" ? "expired" : "failed",
          tx,
        );
      }

      const unlocked = await this.repo.updateBill(
        billId,
        { status: "open", paymentMethod: null, lockedAt: null },
        tx,
      );
      await this.repo.updateSession(bill.sessionId, { status: "open" }, tx);
      return unlocked;
    });

    if (bill) this.emitBill(bill, "bill.updated");
    return bill;
  }

  /**
   * Creates (or reuses) the Midtrans Snap payment for a locked bill. A pending,
   * unexpired request for the same amount is returned as-is so a refresh or
   * double tap never opens a second charge.
   */
  async createOnlinePayment(bill: BillRow) {
    if (bill.status !== "locked") {
      throw new AppError("Tagihan belum dikunci untuk pembayaran", 409, {
        code: "BILL_NOT_LOCKED",
      });
    }

    const pending = await this.repo.findPendingBillPayments(bill.id);
    const reusable = pending.find(
      (p) => p.amount === bill.totalAmount && p.expiresAt > new Date(),
    );
    if (reusable) return reusable;

    const session = await this.repo.findSessionById(bill.sessionId);
    const table = session && (await this.tableRepo.findTableById(session.tableId));
    const tenant = await this.tenantRepo.findTenantById(bill.tenantId);
    if (!session || !table || !tenant) throw new AppError("Session not found", 404);

    const orders = await this.repo.findSessionOrders(bill.sessionId);
    const grossAmount = Math.round(bill.totalAmount / 100); // cents → rupiah

    // Midtrans rejects a charge whose item_details do not sum to gross_amount,
    // so per-line rupiah rounding is absorbed by an explicit adjustment line.
    const lines = new Map<string, { name: string; price: number; quantity: number }>();
    for (const order of orders) {
      if (order.status === "CANCELED") continue;
      for (const item of order.items) {
        const key = `${item.menuId}:${item.price}`;
        const line = lines.get(key);
        if (line) line.quantity += item.quantity;
        else
          lines.set(key, {
            name: item.menuName.slice(0, 50),
            price: Math.round(item.price / 100),
            quantity: item.quantity,
          });
      }
    }
    const itemDetails: { id: string; name: string; price: number; quantity: number }[] =
      [...lines.entries()].map(([id, line]) => ({ id: id.slice(0, 50), ...line }));
    itemDetails.push(
      { id: "TAX", name: "Pajak Restoran (10%)", price: Math.round(bill.taxAmount / 100), quantity: 1 },
      { id: "SERVICE", name: "Service Charge (5%)", price: Math.round(bill.serviceAmount / 100), quantity: 1 },
    );
    const itemsSum = itemDetails.reduce((s, i) => s + i.price * i.quantity, 0);
    if (itemsSum !== grossAmount) {
      itemDetails.push({ id: "ROUNDING", name: "Pembulatan", price: grossAmount - itemsSum, quantity: 1 });
    }

    const midtransOrderId = `BILL-${bill.id.slice(0, 8)}-${Date.now()}`;
    const expiresAt = new Date(Date.now() + ONLINE_PAYMENT_TTL_MS);
    const billUrl = env.FRONTEND_URL
      ? `${env.FRONTEND_URL}/order/${tenant.slug}/${table.qrToken}/bill`
      : undefined;

    const transaction = await snapClient.createTransaction({
      transaction_details: { order_id: midtransOrderId, gross_amount: grossAmount },
      item_details: itemDetails,
      customer_details: { first_name: `${table.name} - ${tenant.name}`.slice(0, 50) },
      enabled_payments: ["qris", "other_qris", "gopay", "shopeepay"],
      expiry: {
        unit: "minutes",
        duration: ONLINE_PAYMENT_TTL_MS / 60_000,
      },
      ...(billUrl && { callbacks: { finish: billUrl } }),
    });

    const payment = await this.repo.createBillPaymentRequest({
      tenantId: bill.tenantId,
      billId: bill.id,
      snapToken: transaction.token,
      snapRedirectUrl: transaction.redirect_url,
      midtransOrderId,
      amount: bill.totalAmount,
      expiresAt,
    });

    this.emitBill(bill, "payment.updated");
    return payment;
  }

  /**
   * Lazily expires an abandoned online payment. Runs on guest/staff reads, so
   * the bill unlocks without a cron job (the API may run serverless).
   */
  async expireStalePayment(sessionId: string) {
    const bill = await this.repo.findBillBySession(sessionId);
    if (!bill || bill.status !== "locked" || bill.paymentMethod !== "online") {
      return;
    }
    const latest = await this.repo.findLatestBillPayment(bill.id);

    if (latest?.status === "pending") {
      if (latest.expiresAt.getTime() > Date.now()) return;
      // A webhook may have been missed: ask Midtrans before giving up.
      const status = await this.reconcile(latest);
      if (status !== "pending") return; // reconcile already settled/unlocked
    } else if (latest?.status === "success") {
      return; // paid but not settled (amount mismatch) — left for staff
    } else if (
      !bill.lockedAt ||
      Date.now() - bill.lockedAt.getTime() < ONLINE_PAYMENT_TTL_MS
    ) {
      return; // locked, guest still choosing — give them the full window
    }
    await this.unlock(bill.id, "expired");
  }

  /**
   * Asks Midtrans for the real status of a pending bill payment and applies it
   * — the recovery path for a missed webhook. Returns the resulting status.
   */
  async reconcile(payment: PaymentRequestRow): Promise<ProviderPaymentStatus> {
    if (payment.status !== "pending" || !payment.billId) return payment.status;
    try {
      const result = await coreApiClient.transaction.status(payment.midtransOrderId);
      const status = mapMidtransStatus(result.transaction_status, result.fraud_status);
      await this.applyProviderStatus(payment, status, {
        grossAmount: result.gross_amount,
        paymentType: result.payment_type,
        transactionId: result.transaction_id,
      });
      return status;
    } catch {
      // 404 until the guest picks a method in Snap; treat as still pending.
      return "pending";
    }
  }

  /**
   * Applies a verified provider status (webhook or reconciliation) to a bill
   * payment. Success only settles the bill when the paid amount equals the
   * bill total; a mismatch is logged and left for staff.
   */
  async applyProviderStatus(
    payment: PaymentRequestRow,
    status: ProviderPaymentStatus,
    info: { grossAmount?: string; paymentType?: string; transactionId?: string },
  ) {
    if (!payment.billId) return;

    if (status === "success") {
      const bill = await this.repo.findBillById(payment.billId);
      if (!bill || bill.status === "paid") {
        await this.repo.setPaymentRequestStatus(payment.id, "success");
        return;
      }
      const paid = Number(info.grossAmount);
      const expected = Math.round(payment.amount / 100);
      if (!Number.isFinite(paid) || paid !== expected) {
        this.logger.error(
          `Bill ${bill.id}: paid amount ${info.grossAmount} != expected ${expected} (payment ${payment.id}). Not settled.`,
        );
        await this.repo.setPaymentRequestStatus(payment.id, "success");
        return;
      }
      try {
        await this.settle(bill.id, {
          paymentMethod: info.paymentType ?? "online",
          paymentRequestId: payment.id,
          midtransTransactionId: info.transactionId,
          expectedTotal: payment.amount,
        });
      } catch (error) {
        if (!(error instanceof AppError) || error.code !== "BILL_TOTAL_CHANGED") {
          throw error;
        }
        this.logger.error(
          `Bill ${bill.id}: orders changed after payment ${payment.id} started. Not settled.`,
        );
        await this.repo.setPaymentRequestStatus(payment.id, "success");
      }
      return;
    }

    if (status === "failed" || status === "expired") {
      await this.repo.setPaymentRequestStatus(payment.id, status);
      const bill = await this.repo.findBillById(payment.billId);
      const latest = bill && (await this.repo.findLatestBillPayment(bill.id));
      // Only unlock when this was the payment in flight.
      if (bill?.status === "locked" && latest?.id === payment.id) {
        await this.unlock(bill.id, status);
      } else if (bill) {
        this.emitBill(bill, "payment.updated");
      }
    }
  }

  /**
   * Marks the bill paid: records one Transaction per unpaid order (so reports
   * keep working per order), closes the session and frees the table.
   * Idempotent — a replayed webhook or double click is a no-op.
   */
  async settle(
    billId: string,
    input: {
      paymentMethod: string;
      paymentRequestId?: string;
      midtransTransactionId?: string;
      /** When set, settling aborts if the bill total no longer matches. */
      expectedTotal?: number;
    },
  ) {
    const result = await this.db.transaction(async (tx) => {
      const bill = await this.repo.lockBill(billId, tx);
      if (!bill) throw new AppError("Bill not found", 404);
      if (bill.status === "paid") return { bill, settledNow: false };

      const session = await this.repo.lockSession(bill.sessionId, tx);
      if (!session) throw new AppError("Session not found", 404);

      const orders = await this.repo.findSessionOrders(bill.sessionId, tx);
      const totals = computeBillTotals(orders);
      if (
        input.expectedTotal !== undefined &&
        totals.totalAmount !== input.expectedTotal
      ) {
        throw new AppError("Bill total changed since payment started", 409, {
          code: "BILL_TOTAL_CHANGED",
        });
      }

      for (const order of orders) {
        if (order.status === "CANCELED" || order.transactionId) continue;
        await this.transactionRepo.createTransaction(
          {
            tenantId: order.tenantId,
            orderId: order.id,
            ...computePriceBreakdown(order.totalPrice),
            paymentMethod: input.paymentMethod,
            paymentRequestId: input.paymentRequestId,
            midtransTransactionId: input.midtransTransactionId,
          },
          tx,
        );
      }

      if (input.paymentRequestId) {
        await this.repo.setPaymentRequestStatus(input.paymentRequestId, "success", tx);
      }
      const now = new Date();
      const paid = await this.repo.updateBill(
        bill.id,
        {
          status: "paid",
          ...totals,
          paymentMethod: input.paymentMethod,
          lockedAt: bill.lockedAt ?? now,
          paidAt: now,
        },
        tx,
      );
      await this.repo.updateSession(
        session.id,
        { status: "closed", closedAt: now, closedReason: "paid" },
        tx,
      );
      await this.repo.handleAllForSession(session.id, tx);
      await this.tableRepo.updateTable(session.tableId, { status: "AVAILABLE" }, tx);
      return { bill: paid!, settledNow: true };
    });

    if (result.settledNow) {
      this.emitBill(result.bill, "bill.updated");
      this.emitBill(result.bill, "session.closed");
    }
    return result.bill;
  }

  private emitBill(
    bill: BillRow,
    type: "bill.updated" | "payment.updated" | "session.closed",
  ) {
    this.events.emit({
      type,
      tenantId: bill.tenantId,
      sessionId: bill.sessionId,
      data: { billId: bill.id, status: bill.status },
    });
  }
}

export function mapMidtransStatus(
  transactionStatus: string,
  fraudStatus?: string,
): ProviderPaymentStatus {
  if (transactionStatus === "capture") {
    return fraudStatus === "accept" ? "success" : "pending";
  }
  if (transactionStatus === "settlement") return "success";
  if (transactionStatus === "expire") return "expired";
  if (["deny", "cancel", "failure"].includes(transactionStatus)) return "failed";
  return "pending";
}
