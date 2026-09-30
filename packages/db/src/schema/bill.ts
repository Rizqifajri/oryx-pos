import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { tableSessions } from "./table-session";
import { tenants } from "./tenant";

/** open ─▶ locked ─▶ paid, and locked ─▶ open when a payment expires/fails. */
export const billStatus = pgEnum("billStatus", ["open", "locked", "paid"]);

/**
 * The table bill for one session. Totals are frozen when the bill is locked
 * for payment; while locked the session accepts no new orders. All amounts are
 * integer cents, computed server-side.
 */
export const bills = pgTable("bills", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => tableSessions.id)
    .notNull()
    .unique(),
  status: billStatus("status").default("open").notNull(),
  subtotal: integer("subtotal").notNull().default(0),
  taxAmount: integer("tax_amount").notNull().default(0),
  serviceAmount: integer("service_amount").notNull().default(0),
  totalAmount: integer("total_amount").notNull().default(0),
  // "online" (Midtrans) or "cashier" while locked; the settled method once paid.
  paymentMethod: text("payment_method"),
  lockedAt: timestamp("locked_at"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
