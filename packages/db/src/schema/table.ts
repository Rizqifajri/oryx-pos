import {
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenant";

export const tableStatus = pgEnum("tableStatus", ["AVAILABLE", "OCCUPIED"]);

export const tables = pgTable("tables", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  name: text("name").notNull(),
  capacity: integer("capacity").notNull(),
  status: tableStatus("status").default("AVAILABLE").notNull(),
  createdAt: date("created_at").notNull().defaultNow(),
});
