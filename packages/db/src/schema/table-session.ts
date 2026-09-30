import { sql } from "drizzle-orm";
import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { tables } from "./table";
import { tenants } from "./tenant";

/**
 * open ──(bill locked)──▶ billing ──(paid)──▶ closed
 *   ▲                        │
 *   └──(payment expired / cancelled)
 * open ──(staff close)──▶ closed
 */
export const tableSessionStatus = pgEnum("tableSessionStatus", [
  "open",
  "billing",
  "closed",
]);

/**
 * One dine-in visit at a table. The first guest scan opens it, later scans
 * (other guests at the same table) join it, and paying the bill closes it.
 */
export const tableSessions = pgTable(
  "table_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .references(() => tenants.id)
      .notNull(),
    tableId: uuid("table_id")
      .references(() => tables.id)
      .notNull(),
    status: tableSessionStatus("status").default("open").notNull(),
    openedAt: timestamp("opened_at").notNull().defaultNow(),
    closedAt: timestamp("closed_at"),
    closedReason: text("closed_reason"),
  },
  (table) => [
    // At most one live session per table, enforced by the database so two
    // guests scanning at the same instant still land in one session.
    uniqueIndex("table_sessions_one_active_per_table_idx")
      .on(table.tableId)
      .where(sql`${table.status} in ('open', 'billing')`),
  ],
);
