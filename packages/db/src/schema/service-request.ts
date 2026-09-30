import { pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { tables } from "./table";
import { tableSessions } from "./table-session";
import { tenants } from "./tenant";
import { users } from "./user";

export const serviceRequestType = pgEnum("serviceRequestType", [
  "call_waiter",
  "water",
  "cutlery",
  "bill",
]);

export const serviceRequestStatus = pgEnum("serviceRequestStatus", [
  "pending",
  "handled",
]);

/** A guest's "Panggil pelayan"-style request, queued for staff. */
export const serviceRequests = pgTable("service_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  sessionId: uuid("session_id")
    .references(() => tableSessions.id)
    .notNull(),
  tableId: uuid("table_id")
    .references(() => tables.id)
    .notNull(),
  type: serviceRequestType("type").notNull(),
  status: serviceRequestStatus("status").default("pending").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  handledAt: timestamp("handled_at"),
  handledBy: uuid("handled_by").references(() => users.id),
});
