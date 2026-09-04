import { relations } from "drizzle-orm";
import { rolePermissions, roles, tenants } from "../schema";

export const roleRelations = relations(roles, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [roles.tenantId],
    references: [tenants.id],
  }),
  rolePermissions: many(rolePermissions),
}));
