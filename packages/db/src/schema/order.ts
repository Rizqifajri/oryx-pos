import { date, integer, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { customers } from "./customer";
import { tables } from "./table";
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
});
