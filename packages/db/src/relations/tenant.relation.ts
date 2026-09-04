import { relations } from "drizzle-orm";
import { tenants, users } from "../schema";

export const tenantRelations = relations(tenants, ({ many }) => ({
  tenantUsers: many(users),
}));
