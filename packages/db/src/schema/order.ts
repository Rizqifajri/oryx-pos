import {
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { customers } from "./customer";
import { tables } from "./table";
import { tableSessions } from "./table-session";
import { tenants } from "./tenant";

export const orderStatus = pgEnum("orderStatus", [
  "NEW",
  "PROCESSING",
  "COMPLETED",
  "CANCELED",
]);

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  tableId: uuid("table_id").references(() => tables.id),
  customerId: uuid("customer_id").references(() => customers.id),
  status: orderStatus("status").default("NEW").notNull(),
  totalPrice: integer("total_price").notNull(),
  // Intended payment method chosen at order time (e.g. cash/qris/debit).
  // Null for QR/self-service orders; the recorded Transaction defaults to this.
  paymentMethod: text("payment_method"),
  createdAt: date("created_at").notNull().defaultNow(),
  // Set for guest QR orders: every "Kirim Pesanan" is one order (a round) in
  // the table's session, and the session's bill settles all of them at once.
  sessionId: uuid("session_id").references(() => tableSessions.id),
  note: text("note"),
  // Client-generated key so a double-tapped submit creates one order.
  idempotencyKey: text("idempotency_key"),
  submittedAt: timestamp("submitted_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("orders_session_idempotency_key_idx").on(
    table.sessionId,
    table.idempotencyKey,
  ),
]);
