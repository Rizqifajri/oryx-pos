import { pgTable, primaryKey, uuid } from "drizzle-orm/pg-core";
import { permissions } from "./permission";
import { roles } from "./role";

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id")
      .references(() => roles.id)
      .notNull(),
    permissionId: uuid("permission_id")
      .references(() => permissions.id)
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  }),
);
