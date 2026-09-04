import { date, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { orders } from "./order";
import { tenants } from "./tenant";

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  orderId: uuid("order_id")
    .references(() => orders.id)
    .notNull(),
  totalAmount: integer("total_amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  createdAt: date("created_at").notNull().defaultNow(),
});
