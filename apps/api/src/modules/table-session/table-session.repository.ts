import { Inject, Injectable } from "@nestjs/common";
import type { Db, DbOrTx } from "@dio-sys-be/db";
import {
  bills,
  menus,
  orderItems,
  orders,
  paymentRequests,
  serviceRequests,
  tableSessions,
  tables,
  transactions,
} from "@dio-sys-be/db/schema";
import { and, asc, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.module";

export type TableSessionRow = typeof tableSessions.$inferSelect;
export type BillRow = typeof bills.$inferSelect;
export type ServiceRequestType =
  (typeof serviceRequests.$inferSelect)["type"];

const ACTIVE_STATUSES = ["open", "billing"] as const;

@Injectable()
export class TableSessionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  // ── Tables ────────────────────────────────────────────────────────────────

  async findTableByQrToken(qrToken: string) {
    const [table] = await this.db
      .select()
      .from(tables)
      .where(eq(tables.qrToken, qrToken))
      .limit(1);
    return table ?? null;
  }

  // ── Sessions ──────────────────────────────────────────────────────────────

  async findSessionById(id: string, tx: DbOrTx = this.db) {
    const [session] = await tx
      .select()
      .from(tableSessions)
      .where(eq(tableSessions.id, id))
      .limit(1);
    return session ?? null;
  }

  /** Locks the session row for the rest of the transaction. */
  async lockSession(id: string, tx: DbOrTx) {
    const [session] = await tx
      .select()
      .from(tableSessions)
      .where(eq(tableSessions.id, id))
      .for("update");
    return session ?? null;
  }

  async findActiveSessionByTable(tableId: string, tx: DbOrTx = this.db) {
    const [session] = await tx
      .select()
      .from(tableSessions)
      .where(
        and(
          eq(tableSessions.tableId, tableId),
          inArray(tableSessions.status, [...ACTIVE_STATUSES]),
        ),
      )
      .limit(1);
    return session ?? null;
  }

  async findActiveSessionsWithTable(tenantId?: string) {
    const conditions = [inArray(tableSessions.status, [...ACTIVE_STATUSES])];
    if (tenantId) conditions.push(eq(tableSessions.tenantId, tenantId));
    return await this.db
      .select({
        id: tableSessions.id,
        tenantId: tableSessions.tenantId,
        tableId: tableSessions.tableId,
        tableName: tables.name,
        status: tableSessions.status,
        openedAt: tableSessions.openedAt,
      })
      .from(tableSessions)
      .innerJoin(tables, eq(tableSessions.tableId, tables.id))
      .where(and(...conditions))
      .orderBy(asc(tableSessions.openedAt));
  }

  /**
   * The table's live session, opening one (and marking the table OCCUPIED) if
   * there is none. Used by both a guest QR scan and a staff/POS table order,
   * so every dine-in order at a table lands on the same bill. The partial
   * unique index makes concurrent first calls converge on one session.
   */
  async findOrOpenSession(table: { id: string; tenantId: string }) {
    const existing = await this.findActiveSessionByTable(table.id);
    if (existing) return { session: existing, opened: false };
    try {
      const session = await this.db.transaction(async (tx) => {
        const [created] = await tx
          .insert(tableSessions)
          .values({ tenantId: table.tenantId, tableId: table.id })
          .returning();
        await tx
          .update(tables)
          .set({ status: "OCCUPIED" })
          .where(eq(tables.id, table.id));
        return created!;
      });
      return { session, opened: true };
    } catch (error) {
      const e = error as { code?: string; cause?: { code?: string } };
      if (e?.code !== "23505" && e?.cause?.code !== "23505") throw error;
      const winner = await this.findActiveSessionByTable(table.id);
      if (!winner) throw error;
      return { session: winner, opened: false };
    }
  }

  async updateSession(
    id: string,
    data: Partial<
      Pick<TableSessionRow, "status" | "closedAt" | "closedReason">
    >,
    tx: DbOrTx = this.db,
  ) {
    const [session] = await tx
      .update(tableSessions)
      .set(data)
      .where(eq(tableSessions.id, id))
      .returning();
    return session ?? null;
  }

  // ── Orders in a session ───────────────────────────────────────────────────

  async findSessionOrders(sessionId: string, tx: DbOrTx = this.db) {
    const orderList = await tx
      .select({
        id: orders.id,
        tenantId: orders.tenantId,
        tableId: orders.tableId,
        sessionId: orders.sessionId,
        status: orders.status,
        totalPrice: orders.totalPrice,
        note: orders.note,
        submittedAt: orders.submittedAt,
        transactionId: transactions.id,
      })
      .from(orders)
      .leftJoin(transactions, eq(transactions.orderId, orders.id))
      .where(eq(orders.sessionId, sessionId))
      .orderBy(asc(orders.submittedAt));

    if (orderList.length === 0) return [];

    const items = await tx
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        menuId: orderItems.menuId,
        menuName: menus.name,
        imageUrl: menus.imageUrl,
        quantity: orderItems.quantity,
        price: orderItems.price,
        note: orderItems.note,
      })
      .from(orderItems)
      .innerJoin(menus, eq(orderItems.menuId, menus.id))
      .where(
        inArray(
          orderItems.orderId,
          orderList.map((o) => o.id),
        ),
      );

    return orderList.map((order) => ({
      ...order,
      items: items.filter((item) => item.orderId === order.id),
    }));
  }

  async findOrderByIdempotencyKey(sessionId: string, key: string) {
    const [order] = await this.db
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.sessionId, sessionId), eq(orders.idempotencyKey, key)))
      .limit(1);
    return order ?? null;
  }

  async createSessionOrder(
    data: {
      tenantId: string;
      tableId: string;
      sessionId: string;
      totalPrice: number;
      note: string | null;
      idempotencyKey: string;
    },
    items: { menuId: string; quantity: number; price: number; note: string | null }[],
    tx: DbOrTx,
  ) {
    const [order] = await tx
      .insert(orders)
      .values({ ...data, status: "NEW" })
      .returning();
    await tx
      .insert(orderItems)
      .values(items.map((item) => ({ ...item, orderId: order!.id })));
    return order!;
  }

  async findOrderById(id: string) {
    const [order] = await this.db
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);
    return order ?? null;
  }

  async updateOrderStatus(
    id: string,
    status: (typeof orders.$inferSelect)["status"],
    tx: DbOrTx = this.db,
  ) {
    const [order] = await tx
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();
    return order ?? null;
  }

  // ── Bills ─────────────────────────────────────────────────────────────────

  async findBillBySession(sessionId: string, tx: DbOrTx = this.db) {
    const [bill] = await tx
      .select()
      .from(bills)
      .where(eq(bills.sessionId, sessionId))
      .limit(1);
    return bill ?? null;
  }

  async findBillById(id: string, tx: DbOrTx = this.db) {
    const [bill] = await tx
      .select()
      .from(bills)
      .where(eq(bills.id, id))
      .limit(1);
    return bill ?? null;
  }

  async lockBill(id: string, tx: DbOrTx) {
    const [bill] = await tx
      .select()
      .from(bills)
      .where(eq(bills.id, id))
      .for("update");
    return bill ?? null;
  }

  /** Creates the session's bill row on first lock, or updates it. */
  async upsertBill(
    data: Omit<typeof bills.$inferInsert, "id" | "createdAt">,
    tx: DbOrTx,
  ) {
    const [bill] = await tx
      .insert(bills)
      .values(data)
      .onConflictDoUpdate({
        target: bills.sessionId,
        set: {
          status: data.status,
          subtotal: data.subtotal,
          taxAmount: data.taxAmount,
          serviceAmount: data.serviceAmount,
          totalAmount: data.totalAmount,
          paymentMethod: data.paymentMethod,
          lockedAt: data.lockedAt,
          paidAt: data.paidAt,
        },
      })
      .returning();
    return bill!;
  }

  async updateBill(
    id: string,
    data: Partial<Omit<BillRow, "id" | "sessionId" | "tenantId" | "createdAt">>,
    tx: DbOrTx = this.db,
  ) {
    const [bill] = await tx
      .update(bills)
      .set(data)
      .where(eq(bills.id, id))
      .returning();
    return bill ?? null;
  }

  // ── Bill payment requests ─────────────────────────────────────────────────

  async findLatestBillPayment(billId: string, tx: DbOrTx = this.db) {
    const [payment] = await tx
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.billId, billId))
      .orderBy(desc(paymentRequests.createdAt))
      .limit(1);
    return payment ?? null;
  }

  async findPendingBillPayments(billId: string, tx: DbOrTx = this.db) {
    return await tx
      .select()
      .from(paymentRequests)
      .where(
        and(
          eq(paymentRequests.billId, billId),
          eq(paymentRequests.status, "pending"),
        ),
      );
  }

  async findPaymentRequestById(id: string) {
    const [payment] = await this.db
      .select()
      .from(paymentRequests)
      .where(eq(paymentRequests.id, id))
      .limit(1);
    return payment ?? null;
  }

  async createBillPaymentRequest(
    data: {
      tenantId: string;
      billId: string;
      snapToken: string;
      snapRedirectUrl: string;
      midtransOrderId: string;
      amount: number;
      expiresAt: Date;
    },
    tx: DbOrTx = this.db,
  ) {
    const [payment] = await tx
      .insert(paymentRequests)
      .values({ ...data, status: "pending" })
      .returning();
    return payment!;
  }

  async setPaymentRequestStatus(
    id: string,
    status: "pending" | "success" | "failed" | "expired",
    tx: DbOrTx = this.db,
  ) {
    await tx
      .update(paymentRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(paymentRequests.id, id));
  }

  // ── Service requests ──────────────────────────────────────────────────────

  async findRecentServiceRequest(
    sessionId: string,
    type: ServiceRequestType,
    since: Date,
  ) {
    const [request] = await this.db
      .select()
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.sessionId, sessionId),
          eq(serviceRequests.type, type),
          gt(serviceRequests.createdAt, since),
        ),
      )
      .orderBy(desc(serviceRequests.createdAt))
      .limit(1);
    return request ?? null;
  }

  async findSessionServiceRequests(sessionId: string, since: Date) {
    return await this.db
      .select()
      .from(serviceRequests)
      .where(
        and(
          eq(serviceRequests.sessionId, sessionId),
          gt(serviceRequests.createdAt, since),
        ),
      )
      .orderBy(desc(serviceRequests.createdAt));
  }

  async createServiceRequest(
    data: {
      tenantId: string;
      sessionId: string;
      tableId: string;
      type: ServiceRequestType;
    },
    tx: DbOrTx = this.db,
  ) {
    const [request] = await tx.insert(serviceRequests).values(data).returning();
    return request!;
  }

  async findPendingServiceRequests(tenantId?: string) {
    const conditions = [eq(serviceRequests.status, "pending")];
    if (tenantId) conditions.push(eq(serviceRequests.tenantId, tenantId));
    return await this.db
      .select({
        id: serviceRequests.id,
        tenantId: serviceRequests.tenantId,
        sessionId: serviceRequests.sessionId,
        tableId: serviceRequests.tableId,
        tableName: tables.name,
        type: serviceRequests.type,
        status: serviceRequests.status,
        createdAt: serviceRequests.createdAt,
      })
      .from(serviceRequests)
      .innerJoin(tables, eq(serviceRequests.tableId, tables.id))
      .where(and(...conditions))
      .orderBy(asc(serviceRequests.createdAt));
  }

  async findServiceRequestById(id: string) {
    const [request] = await this.db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.id, id))
      .limit(1);
    return request ?? null;
  }

  async markServiceRequestHandled(id: string, userId: string) {
    const [request] = await this.db
      .update(serviceRequests)
      .set({ status: "handled", handledAt: new Date(), handledBy: userId })
      .where(eq(serviceRequests.id, id))
      .returning();
    return request ?? null;
  }

  /** Clears the queue for a session once it closes. */
  async handleAllForSession(sessionId: string, tx: DbOrTx = this.db) {
    await tx
      .update(serviceRequests)
      .set({ status: "handled", handledAt: new Date() })
      .where(
        and(
          eq(serviceRequests.sessionId, sessionId),
          eq(serviceRequests.status, "pending"),
        ),
      );
  }

  // ── Public menu ───────────────────────────────────────────────────────────

  async findPublicMenus(tenantId: string) {
    return await this.db
      .select({
        id: menus.id,
        categoryId: menus.categoryId,
        name: menus.name,
        description: menus.description,
        price: menus.price,
        imageUrl: menus.imageUrl,
        isAvailable: menus.isAvailable,
        isPopular: menus.isPopular,
        badge: menus.badge,
      })
      .from(menus)
      .where(and(eq(menus.tenantId, tenantId), isNull(menus.deletedAt)))
      .orderBy(asc(menus.name));
  }
}
