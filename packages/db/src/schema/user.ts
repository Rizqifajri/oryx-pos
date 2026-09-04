import { date, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { roles } from "./role";
import { tenants } from "./tenant";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  roleId: uuid("role_id")
    .references(() => roles.id)
    .notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  refreshToken: text("refresh_token"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  createdAt: date("created_at").notNull().defaultNow(),
});
