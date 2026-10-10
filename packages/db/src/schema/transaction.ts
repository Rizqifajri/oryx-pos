import { date, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { orders } from "./order";
import { paymentRequests } from "./payment-request";
import { tenants } from "./tenant";

export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  orderId: uuid("order_id")
    .references(() => orders.id)
    .notNull(),
  // Link to payment request if paid via Midtrans
  paymentRequestId: uuid("payment_request_id").references(
    () => paymentRequests.id,
  ),
  // Midtrans transaction ID for reference
  midtransTransactionId: text("midtrans_transaction_id"),
  // All amounts are stored as integer cents. `subtotal` is the menu-based
  // order total; `taxAmount` and `serviceAmount` are server-computed charges;
  // `totalAmount` = subtotal + tax + service (what the customer actually pays).
  subtotal: integer("subtotal").notNull().default(0),
  taxAmount: integer("tax_amount").notNull().default(0),
  serviceAmount: integer("service_amount").notNull().default(0),
  totalAmount: integer("total_amount").notNull(),
  paymentMethod: text("payment_method").notNull(),
  createdAt: date("created_at").notNull().defaultNow(),
});
