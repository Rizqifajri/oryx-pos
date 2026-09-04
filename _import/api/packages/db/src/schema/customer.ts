import { date, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { tenants } from "./tenant";

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  createdAt: date("created_at").notNull().defaultNow(),
});
