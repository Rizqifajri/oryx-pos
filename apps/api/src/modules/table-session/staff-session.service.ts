import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@dio-sys-be/db";
import { AppError } from "../../common/errors/app-error";
import { SessionEventsService } from "../../common/realtime/session-events.service";
import type { UserContext } from "../../common/types/user-context";
import { assertTenantMatch } from "../../common/utils/assert-permission";
import { DRIZZLE } from "../../database/database.module";
import { TableRepository } from "../table/table.repository";
import { BillService } from "./bill.service";
import { SplitService } from "./split.service";
import { TableSessionRepository } from "./table-session.repository";
import type { CloseSessionInput, SplitBillInput } from "./table-session.schema";

/** Staff-side management of guest table sessions, bills and service requests. */
@Injectable()
export class StaffSessionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly repo: TableSessionRepository,
    private readonly bills: BillService,
    private readonly split: SplitService,
    private readonly tableRepo: TableRepository,
    private readonly events: SessionEventsService,
  ) {}

  private scopeTenant(ctx: UserContext, tenantId?: string) {
    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) throw new AppError("Tenant context required", 400);
      return ctx.tenantId;
    }
    return tenantId;
  }

  /** Live sessions with their running bill, for the tables screen. */
  async listActive(ctx: UserContext, tenantId?: string) {
    const sessions = await this.repo.findActiveSessionsWithTable(
      this.scopeTenant(ctx, tenantId),
    );
    return await Promise.all(
      sessions.map(async (session) => {
        await this.bills.expireStalePayment(session.id);
        const [orders, bill] = await Promise.all([
          this.repo.findSessionOrders(session.id),
          this.bills.getBillView(session.id),
        ]);
        return {
          ...session,
          orderCount: orders.filter((o) => o.status !== "CANCELED").length,
          activeOrderCount: orders.filter(
            (o) => o.status === "NEW" || o.status === "PROCESSING",
          ).length,
          bill,
        };
      }),
    );
  }

  async getSession(ctx: UserContext, id: string) {
    const session = await this.requireSession(ctx, id);
    const [orders, bill] = await Promise.all([
      this.repo.findSessionOrders(id),
      this.bills.getBillView(id),
    ]);
    return { ...session, orders, bill };
  }

  /**
   * Cashier path: staff collected payment at the table/counter. Locks the bill
   * (if the guest had not) and settles it, which closes the session.
   */
  async settle(ctx: UserContext, id: string, paymentMethod: string) {
    const session = await this.requireSession(ctx, id);
    if (session.status === "closed") {
      throw new AppError("Session is already closed", 409, { code: "SESSION_CLOSED" });
    }
    // A split bill: the remaining shares are collected with this method.
    const splitBill = await this.split.payRemainingShares(id, paymentMethod);
    if (splitBill) return splitBill;
    const bill = await this.bills.lock(id, "cashier");
    return await this.bills.settle(bill.id, { paymentMethod });
  }

  async splitBill(ctx: UserContext, id: string, input: SplitBillInput) {
    await this.requireActive(ctx, id);
    return await this.split.split(id, input);
  }

  async cancelSplit(ctx: UserContext, id: string) {
    await this.requireActive(ctx, id);
    return await this.split.cancelSplit(id);
  }

  async payShare(ctx: UserContext, id: string, shareId: string, paymentMethod: string) {
    await this.requireActive(ctx, id);
    return await this.split.payShareAtCashier(id, shareId, paymentMethod);
  }

  /**
   * Moves the party to a free table. Orders, requests and the bill travel
   * with the session; guests' phones follow via the session.moved event.
   */
  async transfer(ctx: UserContext, id: string, toTableId: string) {
    const session = await this.requireActive(ctx, id);
    const to = await this.tableRepo.findTableById(toTableId);
    if (!to || to.tenantId !== session.tenantId) throw new AppError("Table not found", 404);
    if (to.id === session.tableId) throw new AppError("The party is already at this table", 400);
    if (await this.repo.findActiveSessionByTable(to.id)) {
      throw new AppError(`${to.name} already has guests. Merge the tables instead.`, 409, {
        code: "TABLE_OCCUPIED",
      });
    }

    try {
      await this.db.transaction(async (tx) => {
        const locked = await this.repo.lockSession(id, tx);
        if (!locked || locked.status === "closed") {
          throw new AppError("Session is already closed", 409, { code: "SESSION_CLOSED" });
        }
        await this.repo.moveSessionToTable(id, to.id, tx);
        await this.repo.setTableStatus(session.tableId, "AVAILABLE", tx);
        await this.repo.setTableStatus(to.id, "OCCUPIED", tx);
      });
    } catch (error) {
      const e = error as { code?: string; cause?: { code?: string } };
      if (e?.code === "23505" || e?.cause?.code === "23505") {
        throw new AppError(`${to.name} just got guests. Merge the tables instead.`, 409, {
          code: "TABLE_OCCUPIED",
        });
      }
      throw error;
    }

    this.events.emit({
      type: "session.moved",
      tenantId: session.tenantId,
      sessionId: id,
      data: { tableId: to.id, tableName: to.name },
    });
    return await this.repo.findSessionById(id);
  }

  /**
   * Merges this table's tab into another open tab: orders and requests move
   * over, this session closes (merged) and its table is freed. Guests of the
   * merged table are switched to the combined session on their phones.
   */
  async merge(ctx: UserContext, id: string, intoSessionId: string) {
    if (id === intoSessionId) throw new AppError("Choose a different table to merge into", 400);
    const source = await this.requireActive(ctx, id);
    const target = await this.requireActive(ctx, intoSessionId);
    if (source.tenantId !== target.tenantId) throw new AppError("Session not found", 404);

    await this.db.transaction(async (tx) => {
      // Lock in a stable order so two opposite merges cannot deadlock.
      const [first, second] = [id, intoSessionId].sort();
      const a = await this.repo.lockSession(first!, tx);
      const b = await this.repo.lockSession(second!, tx);
      for (const s of [a, b]) {
        if (!s || s.status !== "open") {
          throw new AppError(
            "Both tables must be open (not paying). Unlock the bill first.",
            409,
            { code: "SESSION_NOT_OPEN" },
          );
        }
      }
      await this.repo.reassignSessionContent(id, { sessionId: target.id, tableId: target.tableId }, tx);
      await this.repo.markSessionMerged(id, target.id, tx);
      await this.repo.setTableStatus(source.tableId, "AVAILABLE", tx);
    });

    this.events.emit({
      type: "session.merged",
      tenantId: source.tenantId,
      sessionId: id,
      data: { intoSessionId: target.id },
    });
    this.events.emit({ type: "order.updated", tenantId: target.tenantId, sessionId: target.id });
    return await this.repo.findSessionById(target.id);
  }

  /** Releases a bill stuck in `locked` so the table can order again. */
  async unlockBill(ctx: UserContext, id: string) {
    await this.requireSession(ctx, id);
    const bill = await this.repo.findBillBySession(id);
    if (bill?.status === "locked") await this.bills.unlock(bill.id, "cancelled");
    return await this.bills.getBillView(id);
  }

  /**
   * Ends a session without payment (walk-out, test scan, mistake). Refuses when
   * there are unpaid orders unless `force` is set, in which case those orders
   * stay unpaid on record.
   */
  async close(ctx: UserContext, id: string, input: CloseSessionInput) {
    const session = await this.requireSession(ctx, id);
    if (session.status === "closed") return session;

    const orders = await this.repo.findSessionOrders(id);
    const unpaid = orders.filter((o) => o.status !== "CANCELED" && !o.transactionId);
    if (unpaid.length > 0 && !input.force) {
      throw new AppError(
        `Session has ${unpaid.length} unpaid order(s). Settle the bill or close with force.`,
        409,
        { code: "UNPAID_ORDERS" },
      );
    }

    const closed = await this.db.transaction(async (tx) => {
      const bill = await this.repo.findBillBySession(id, tx);
      if (bill) {
        for (const payment of await this.repo.findPendingBillPayments(bill.id, tx)) {
          await this.repo.setPaymentRequestStatus(payment.id, "failed", tx);
        }
      }
      const updated = await this.repo.updateSession(
        id,
        {
          status: "closed",
          closedAt: new Date(),
          closedReason: input.reason || (unpaid.length > 0 ? "voided" : "closed"),
        },
        tx,
      );
      await this.repo.handleAllForSession(id, tx);
      await this.tableRepo.updateTable(session.tableId, { status: "AVAILABLE" }, tx);
      return updated!;
    });

    this.events.emit({
      type: "session.closed",
      tenantId: session.tenantId,
      sessionId: id,
    });
    return closed;
  }

  async listServiceRequests(ctx: UserContext, tenantId?: string) {
    return await this.repo.findPendingServiceRequests(this.scopeTenant(ctx, tenantId));
  }

  async handleServiceRequest(ctx: UserContext, id: string) {
    const request = await this.repo.findServiceRequestById(id);
    if (!request) throw new AppError("Service request not found", 404);
    if (ctx.scope === "TENANT") assertTenantMatch(ctx, request.tenantId);
    if (request.status === "handled") return request;
    return await this.repo.markServiceRequestHandled(id, ctx.userId);
  }

  private async requireActive(ctx: UserContext, id: string) {
    const session = await this.requireSession(ctx, id);
    if (session.status === "closed") {
      throw new AppError("Session is already closed", 409, { code: "SESSION_CLOSED" });
    }
    return session;
  }

  private async requireSession(ctx: UserContext, id: string) {
    const session = await this.repo.findSessionById(id);
    if (!session) throw new AppError("Session not found", 404);
    if (ctx.scope === "TENANT") assertTenantMatch(ctx, session.tenantId);
    return session;
  }
}
