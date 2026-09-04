import { date, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenant";

export const roleScope = pgEnum("roleScope", ["GLOBAL", "TENANT"]);

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  name: text("name").notNull(),
  scope: roleScope("scope").default("TENANT").notNull(),
  createdAt: date("created_at").notNull().defaultNow(),
});
