import { Inject, Injectable } from "@nestjs/common";
import type { Db, DbOrTx } from "@dio-sys-be/db";
import { permissions, rolePermissions, roles, users } from "@dio-sys-be/db/schema";
import { count, eq, inArray } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.module";

@Injectable()
export class RoleRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findAllRoles() {
    const allRoles = await this.db.select().from(roles);

    if (allRoles.length === 0) return [];

    const roleIds = allRoles.map((r) => r.id);
    const allPerms = await this.db
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
      permissions: allPerms
        .filter((p) => p.roleId === role.id)
        .map((p) => ({ id: p.id, name: p.name })),
    }));
  }

  async findRolesByTenantId(tenantId: string) {
    const tenantRoles = await this.db
      .select()
      .from(roles)
      .where(eq(roles.tenantId, tenantId));

    if (tenantRoles.length === 0) return [];

    const roleIds = tenantRoles.map((r) => r.id);
    const allPerms = await this.db
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
      permissions: allPerms
        .filter((p) => p.roleId === role.id)
        .map((p) => ({ id: p.id, name: p.name })),
    }));
  }

  async findRoleById(id: string) {
    const role = await this.db
      .select()
      .from(roles)
      .where(eq(roles.id, id))
      .limit(1);
    if (!role[0]) return null;

    const perms = await this.db
      .select({ id: permissions.id, name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, id));

    return {
      ...role[0],
      permissions: perms,
    };
  }

  async createRole(
    data: {
      tenantId: string;
      name: string;
      scope: "GLOBAL" | "TENANT";
    },
    tx: DbOrTx = this.db,
  ) {
    const result = await tx.insert(roles).values(data).returning();
    return result[0];
  }

  async updateRole(
    id: string,
    data: { name?: string; scope?: "GLOBAL" | "TENANT" },
    tx: DbOrTx = this.db,
  ) {
    const values = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== undefined),
    );

    // Editing only a role's permissions sends no column changes, and Drizzle
    // throws on an empty `set()`. Return the row unchanged instead.
    if (Object.keys(values).length === 0) {
      const existing = await tx
        .select()
        .from(roles)
        .where(eq(roles.id, id))
        .limit(1);
      return existing[0] || null;
    }

    const result = await tx
      .update(roles)
      .set(values)
      .where(eq(roles.id, id))
      .returning();
    return result[0] || null;
  }

  async countUsersWithRole(roleId: string) {
    const [row] = await this.db.select({ n: count() }).from(users).where(eq(users.roleId, roleId));
    return row?.n ?? 0;
  }

  async deleteRole(id: string) {
    // One transaction: if users still hold the role, its permissions are kept.
    return await this.db.transaction(async (tx) => {
      await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, id));
      const result = await tx.delete(roles).where(eq(roles.id, id)).returning();
      return result[0] || null;
    });
  }

  async syncRolePermissions(
    roleId: string,
    permissionIds: string[],
    tx: DbOrTx = this.db,
  ) {
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));

    if (permissionIds.length > 0) {
      const values = permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      }));
      await tx.insert(rolePermissions).values(values);
    }
  }
}
