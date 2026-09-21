import { integer, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { orders } from "./order";
import { tenants } from "./tenant";

export const paymentRequestStatus = pgEnum("paymentRequestStatus", [
  "pending",
  "success",
  "failed",
  "expired",
]);

export const paymentRequests = pgTable("payment_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  orderId: uuid("order_id")
    .references(() => orders.id)
    .notNull(),
  // Midtrans Snap token and redirect URL
  snapToken: text("snap_token").notNull(),
  snapRedirectUrl: text("snap_redirect_url").notNull(),
  // Unique order ID for Midtrans (format: ORD-{orderId}-{timestamp})
  midtransOrderId: text("midtrans_order_id").notNull().unique(),
  // Amount in integer cents
  amount: integer("amount").notNull(),
  // Payment status
  status: paymentRequestStatus("status").default("pending").notNull(),
  // Payment details from Midtrans
  paymentType: text("payment_type"), // e.g., "gopay", "qris", "bank_transfer"
  fraudStatus: text("fraud_status"), // e.g., "accept", "deny", "challenge"
  // Timestamps
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
