import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@dio-sys-be/db";
import { AppError } from "../../common/errors/app-error";
import { SessionEventsService } from "../../common/realtime/session-events.service";
import type { UserContext } from "../../common/types/user-context";
import { assertTenantMatch } from "../../common/utils/assert-permission";
import { DRIZZLE } from "../../database/database.module";
import { TableRepository } from "../table/table.repository";
import { BillService } from "./bill.service";
import { TableSessionRepository } from "./table-session.repository";
import type { CloseSessionInput } from "./table-session.schema";

/** Staff-side management of guest table sessions, bills and service requests. */
@Injectable()
export class StaffSessionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly repo: TableSessionRepository,
    private readonly bills: BillService,
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
    const bill = await this.bills.lock(id, "cashier");
    return await this.bills.settle(bill.id, { paymentMethod });
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

  private async requireSession(ctx: UserContext, id: string) {
    const session = await this.repo.findSessionById(id);
    if (!session) throw new AppError("Session not found", 404);
    if (ctx.scope === "TENANT") assertTenantMatch(ctx, session.tenantId);
    return session;
  }
}
