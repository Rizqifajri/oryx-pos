import { db } from "@dio-sys-be/db";
import { permissions, rolePermissions, roles } from "@dio-sys-be/db/schema";
import { eq, inArray } from "drizzle-orm";

export const findAllRoles = async () => {
  const allRoles = await db.select().from(roles);
  
  if (allRoles.length === 0) return [];
  
  const roleIds = allRoles.map((r) => r.id);
  const allPerms = await db
    .select({
      roleId: rolePermissions.roleId,
      id: permissions.id,
      name: permissions.name,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(inArray(rolePermissions.roleId, roleIds));
  
  return allRoles.map((role) => ({
    ...role,
    permissions: allPerms.filter((p) => p.roleId === role.id).map((p) => ({ id: p.id, name: p.name })),
  }));
};

export const findRolesByTenantId = async (tenantId: string) => {
  const tenantRoles = await db.select().from(roles).where(eq(roles.tenantId, tenantId));
  
  if (tenantRoles.length === 0) return [];
  
  const roleIds = tenantRoles.map((r) => r.id);
  const allPerms = await db
    .select({
      roleId: rolePermissions.roleId,
      id: permissions.id,
      name: permissions.name,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(inArray(rolePermissions.roleId, roleIds));
  
  return tenantRoles.map((role) => ({
    ...role,
    permissions: allPerms.filter((p) => p.roleId === role.id).map((p) => ({ id: p.id, name: p.name })),
  }));
};

export const findRoleById = async (id: string) => {
  const role = await db.select().from(roles).where(eq(roles.id, id)).limit(1);
  if (!role[0]) return null;

  const perms = await db
    .select({ id: permissions.id, name: permissions.name })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, id));

  return {
    ...role[0],
    permissions: perms,
  };
};

export const createRole = async (data: {
  tenantId: string;
  name: string;
  scope: "GLOBAL" | "TENANT";
}) => {
  const result = await db.insert(roles).values(data).returning();
  return result[0];
};

export const updateRole = async (
  id: string,
  data: { name?: string; scope?: "GLOBAL" | "TENANT" },
) => {
  const result = await db
    .update(roles)
    .set(data)
    .where(eq(roles.id, id))
    .returning();
  return result[0] || null;
};

export const deleteRole = async (id: string) => {
  const result = await db.delete(roles).where(eq(roles.id, id)).returning();
  return result[0] || null;
};

export const syncRolePermissions = async (
  roleId: string,
  permissionIds: string[],
  tx?: any,
) => {
  const dbInstance = tx || db;

  await dbInstance
    .delete(rolePermissions)
    .where(eq(rolePermissions.roleId, roleId));

  if (permissionIds.length > 0) {
    const values = permissionIds.map((permissionId) => ({
      roleId,
      permissionId,
    }));
    await dbInstance.insert(rolePermissions).values(values);
  }
};
