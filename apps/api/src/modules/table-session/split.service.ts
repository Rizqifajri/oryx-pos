import { Inject, Injectable, Logger } from "@nestjs/common";
import type { Db } from "@dio-sys-be/db";
import type { BillShareItem } from "@dio-sys-be/db/schema";
import { env } from "@dio-sys-be/env/server";
import { AppError } from "../../common/errors/app-error";
import { SessionEventsService } from "../../common/realtime/session-events.service";
import { computePriceBreakdown } from "../../common/utils/pricing";
import { DRIZZLE } from "../../database/database.module";
import { coreApiClient } from "../payment/payment.config";
import { TableRepository } from "../table/table.repository";
import { TenantRepository } from "../tenant/tenant.repository";
import { BillService, mapMidtransStatus, type ProviderPaymentStatus } from "./bill.service";
import {
  type BillRow,
  type PaymentRequestRow,
  TableSessionRepository,
} from "./table-session.repository";
import type { SplitBillInput } from "./table-session.schema";

type ShareDraft = { label: string; amount: number; items: BillShareItem[] | null };

/**
 * Split bill: a locked bill divided into shares (evenly, by items, or custom
 * amounts) that are paid one by one — at the cashier or online by a guest.
 * When the last share is paid the bill is settled exactly like a full payment
 * (one Transaction per order), so reports need no special case.
 */
@Injectable()
export class SplitService {
  private readonly logger = new Logger(SplitService.name);

  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly repo: TableSessionRepository,
    private readonly bills: BillService,
    private readonly tableRepo: TableRepository,
    private readonly tenantRepo: TenantRepository,
    private readonly events: SessionEventsService,
  ) {}

  /**
   * Divides the session's bill into shares, locking it first if needed.
   * Re-splitting replaces pending shares; it is refused once any share is paid.
   */
  async split(sessionId: string, input: SplitBillInput) {
    const bill = await this.bills.lock(sessionId, "cashier");

    await this.db.transaction(async (tx) => {
      const locked = await this.repo.lockBill(bill.id, tx);
      if (!locked || locked.status !== "locked") {
        throw new AppError("Bill is not open for payment", 409, { code: "BILL_NOT_LOCKED" });
      }
      const existing = await this.repo.findShares(bill.id, tx);
      if (existing.some((s) => s.status === "paid")) {
        throw new AppError("Part of this bill is already paid; it can no longer be re-split.", 409, {
          code: "SHARES_PAID",
        });
      }

      const orders = await this.repo.findSessionOrders(sessionId, tx);
      const drafts = this.draftShares(input, orders, locked.totalAmount);

      await this.repo.voidPendingShares(bill.id, tx);
      for (const payment of await this.repo.findPendingBillPayments(bill.id, tx)) {
        await this.repo.setPaymentRequestStatus(payment.id, "failed", tx);
      }
      await this.repo.insertShares(
        drafts.map((d, i) => ({
          tenantId: locked.tenantId,
          billId: locked.id,
          label: d.label,
          amount: d.amount,
          items: d.items,
          sortOrder: i,
        })),
        tx,
      );
      await this.repo.updateBill(locked.id, { splitMode: input.mode, paymentMethod: "split" }, tx);
    });

    this.emit(bill, "bill.updated");
    return await this.bills.getBillView(sessionId);
  }

  /** Removes the split and unlocks the bill (only while nothing is paid). */
  async cancelSplit(sessionId: string) {
    const bill = await this.repo.findBillBySession(sessionId);
    if (bill?.status === "locked") await this.bills.unlock(bill.id, "cancelled");
    return await this.bills.getBillView(sessionId);
  }

  /** Cashier collected one share (cash / EDC / QRIS at the counter). */
  async payShareAtCashier(sessionId: string, shareId: string, paymentMethod: string) {
    const share = await this.requireShare(sessionId, shareId);
    await this.markSharePaid(share.id, paymentMethod);
    return await this.bills.getBillView(sessionId);
  }

  /**
   * Staff settles whatever is still unpaid in one go (e.g. the last guest
   * pays everything left). Pending shares are marked paid with this method.
   */
  async payRemainingShares(sessionId: string, paymentMethod: string) {
    const bill = await this.repo.findBillBySession(sessionId);
    if (!bill?.splitMode) return null;
    const shares = await this.repo.findShares(bill.id);
    for (const share of shares.filter((s) => s.status === "pending")) {
      await this.markSharePaid(share.id, paymentMethod);
    }
    return await this.repo.findBillById(bill.id);
  }

  /** Snap payment for one share (reuses a pending one for the same share). */
  async createShareOnlinePayment(sessionId: string, shareId: string) {
    const share = await this.requireShare(sessionId, shareId);
    if (share.status !== "pending") {
      throw new AppError("Bagian ini sudah dibayar", 409, { code: "SHARE_PAID" });
    }
    const reusable = (await this.repo.findPendingSharePayments(share.id)).find(
      (p) => p.amount === share.amount && p.expiresAt > new Date(),
    );
    if (reusable) return reusable;

    const bill = (await this.repo.findBillById(share.billId))!;
    const session = await this.repo.findSessionById(sessionId);
    const table = session && (await this.tableRepo.findTableById(session.tableId));
    const tenant = await this.tenantRepo.findTenantById(bill.tenantId);
    if (!table || !tenant) throw new AppError("Session not found", 404);

    const grossAmount = Math.round(share.amount / 100);
    return await this.bills.createSnapPayment({
      bill,
      amount: share.amount,
      grossAmount,
      itemDetails: [
        { id: `SHARE-${share.id.slice(0, 8)}`, name: `${share.label} · ${table.name}`.slice(0, 50), price: grossAmount, quantity: 1 },
      ],
      prefix: "SHARE",
      customerName: `${share.label} - ${table.name}`,
      shareId: share.id,
      finishUrl: env.FRONTEND_URL
        ? `${env.FRONTEND_URL}/order/${tenant.slug}/${table.qrToken}/bill`
        : undefined,
    });
  }

  /** Verified provider status for a share payment (webhook or reconcile). */
  async applyProviderStatus(
    payment: PaymentRequestRow,
    status: ProviderPaymentStatus,
    info: { grossAmount?: string; paymentType?: string },
  ) {
    if (!payment.shareId) return;
    if (status === "success") {
      const expected = Math.round(payment.amount / 100);
      if (Number(info.grossAmount) !== expected) {
        this.logger.error(
          `Share ${payment.shareId}: paid ${info.grossAmount} != expected ${expected} (payment ${payment.id}). Not applied.`,
        );
        await this.repo.setPaymentRequestStatus(payment.id, "success");
        return;
      }
      await this.repo.setPaymentRequestStatus(payment.id, "success");
      const share = await this.repo.findShareById(payment.shareId);
      if (!share || share.status === "void" || share.amount !== payment.amount) {
        // The bill was re-split (or split cancelled) after this payment
        // started: money arrived for a share that no longer exists.
        this.logger.error(
          `Share ${payment.shareId} changed after payment ${payment.id} started. Not applied — reconcile manually.`,
        );
        return;
      }
      await this.markSharePaid(payment.shareId, info.paymentType ?? "online");
      return;
    }
    if (status === "failed" || status === "expired") {
      await this.repo.setPaymentRequestStatus(payment.id, status);
      const bill = payment.billId && (await this.repo.findBillById(payment.billId));
      if (bill) this.emit(bill, "payment.updated");
    }
  }

  /** Ask Midtrans about a pending share payment (missed-webhook recovery). */
  async reconcile(payment: PaymentRequestRow): Promise<ProviderPaymentStatus> {
    if (payment.status !== "pending" || !payment.shareId) return payment.status;
    try {
      const result = await coreApiClient.transaction.status(payment.midtransOrderId);
      const status = mapMidtransStatus(result.transaction_status, result.fraud_status);
      await this.applyProviderStatus(payment, status, {
        grossAmount: result.gross_amount,
        paymentType: result.payment_type,
      });
      return status;
    } catch {
      return "pending";
    }
  }

  /**
   * Marks a share paid (idempotent) and, when it was the last one, settles the
   * bill: Transactions per order, session closed, table freed.
   */
  private async markSharePaid(shareId: string, paymentMethod: string) {
    const outcome = await this.db.transaction(async (tx) => {
      const share = await this.repo.lockShare(shareId, tx);
      if (!share || share.status !== "pending") return null;
      await this.repo.updateShare(share.id, { status: "paid", paymentMethod, paidAt: new Date() }, tx);
      const shares = await this.repo.findShares(share.billId, tx);
      return { billId: share.billId, shares };
    });
    if (!outcome) return;

    const bill = await this.repo.findBillById(outcome.billId);
    if (!bill) return;
    if (outcome.shares.some((s) => s.status !== "paid")) {
      this.emit(bill, "payment.updated");
      return;
    }
    const methods = new Set(outcome.shares.map((s) => s.paymentMethod));
    await this.bills.settle(bill.id, {
      paymentMethod: methods.size === 1 ? [...methods][0]! : "split",
      expectedTotal: bill.totalAmount,
    });
  }

  private async requireShare(sessionId: string, shareId: string) {
    const share = await this.repo.findShareById(shareId);
    const bill = share && (await this.repo.findBillById(share.billId));
    if (!share || !bill || bill.sessionId !== sessionId || share.status === "void") {
      throw new AppError("Bagian tagihan tidak ditemukan", 404);
    }
    if (bill.status !== "locked") {
      throw new AppError("Tagihan tidak sedang dibayar", 409, { code: "BILL_NOT_LOCKED" });
    }
    return share;
  }

  /** Turns a split request into share amounts that sum exactly to `total`. */
  private draftShares(
    input: SplitBillInput,
    orders: Awaited<ReturnType<TableSessionRepository["findSessionOrders"]>>,
    total: number,
  ): ShareDraft[] {
    const label = (i: number, given?: string) => given?.trim() || `Bagian ${i + 1}`;

    if (input.mode === "equal") {
      const n = input.count;
      // Whole rupiah per share; the rounding remainder goes to the last one.
      const base = Math.floor(total / n / 100) * 100;
      return Array.from({ length: n }, (_, i) => ({
        label: label(i),
        amount: i === n - 1 ? total - base * (n - 1) : base,
        items: null,
      }));
    }

    if (input.mode === "custom") {
      const sum = input.shares.reduce((s, x) => s + x.amount, 0);
      if (sum !== total) {
        throw new AppError(`Share amounts must add up to the bill total (${sum} ≠ ${total}).`, 422, {
          code: "SPLIT_TOTAL_MISMATCH",
          details: { total, sum },
        });
      }
      return input.shares.map((x, i) => ({ label: label(i, x.label), amount: x.amount, items: null }));
    }

    // By items: every unit of every billable item goes to exactly one share.
    const units = new Map<string, { quantity: number; price: number }>();
    for (const order of orders) {
      if (order.status === "CANCELED") continue;
      for (const item of order.items) units.set(item.id, { quantity: item.quantity, price: item.price });
    }
    const assigned = new Map<string, number>();
    const drafts = input.shares.map((share, i) => {
      const items = share.items.filter((it) => it.quantity > 0);
      if (items.length === 0) {
        throw new AppError(`${label(i, share.label)} has no items.`, 422, { code: "SPLIT_EMPTY_SHARE" });
      }
      let subtotal = 0;
      for (const it of items) {
        const unit = units.get(it.orderItemId);
        if (!unit) {
          throw new AppError("An item in the split is not on this bill.", 422, { code: "SPLIT_UNKNOWN_ITEM" });
        }
        assigned.set(it.orderItemId, (assigned.get(it.orderItemId) ?? 0) + it.quantity);
        subtotal += unit.price * it.quantity;
      }
      return { label: label(i, share.label), amount: computePriceBreakdown(subtotal).totalAmount, items };
    });
    for (const [id, unit] of units) {
      if ((assigned.get(id) ?? 0) !== unit.quantity) {
        throw new AppError("Every item must be assigned to exactly one share.", 422, {
          code: "SPLIT_ITEMS_UNASSIGNED",
          details: { orderItemId: id, expected: unit.quantity, assigned: assigned.get(id) ?? 0 },
        });
      }
    }
    // Per-share tax rounding can drift a few cents from the bill; the last
    // share absorbs it so shares always sum to the bill total.
    const drift = total - drafts.reduce((s, d) => s + d.amount, 0);
    drafts[drafts.length - 1]!.amount += drift;
    return drafts;
  }

  private emit(bill: BillRow, type: "bill.updated" | "payment.updated") {
    this.events.emit({
      type,
      tenantId: bill.tenantId,
      sessionId: bill.sessionId,
      data: { billId: bill.id },
    });
  }
}
