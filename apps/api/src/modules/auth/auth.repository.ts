import { Inject, Injectable } from "@nestjs/common";
import type { Db, DbOrTx } from "@dio-sys-be/db";
import {
  permissions,
  rolePermissions,
  roles,
  tenants,
  users,
} from "@dio-sys-be/db/schema";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.module";

@Injectable()
export class AuthRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findUserByEmail(email: string) {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0] ?? null;
  }

  async findUserById(id: string) {
    const result = await this.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findTenantBySlug(slug: string) {
    const result = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.slug, slug))
      .limit(1);
    return result[0] ?? null;
  }

  // The create* helpers below run inside register()'s transaction, so `tx` is
  // required rather than defaulted.
  async createTenant(data: { name: string; slug: string }, tx: DbOrTx) {
    const [tenant] = await tx.insert(tenants).values(data).returning();
    if (!tenant) throw new Error("Failed to create tenant");
    return tenant;
  }

  async createRole(
    data: { tenantId: string; name: string; scope: "GLOBAL" | "TENANT" },
    tx: DbOrTx,
  ) {
    const [role] = await tx.insert(roles).values(data).returning();
    if (!role) throw new Error("Failed to create role");
    return role;
  }

  async findAllPermissions(tx: DbOrTx) {
    return tx.select().from(permissions);
  }

  async createRolePermissions(
    rows: { roleId: string; permissionId: string }[],
    tx: DbOrTx,
  ) {
    if (rows.length === 0) return;
    await tx.insert(rolePermissions).values(rows);
  }

  async createUser(
    data: {
      tenantId: string;
      roleId: string;
      name: string;
      email: string;
      password: string;
    },
    tx: DbOrTx,
  ) {
    const [user] = await tx.insert(users).values(data).returning();
    if (!user) throw new Error("Failed to create user");
    return user;
  }

  async findTenantById(id: string) {
    const result = await this.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, id))
      .limit(1);
    return result[0] ?? null;
  }

  async findRoleWithPermissions(roleId: string) {
    const roleResult = await this.db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (!roleResult[0]) return null;

    const perms = await this.db
      .select({ name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));

    return {
      ...roleResult[0],
      permissions: perms.map((p) => p.name),
    };
  }

  async updateUserRefreshToken(
    userId: string,
    refreshToken: string,
    expiresAt: Date,
  ) {
    const [user] = await this.db
      .update(users)
      .set({ refreshToken, refreshTokenExpiresAt: expiresAt })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async clearUserRefreshToken(userId: string) {
    await this.db
      .update(users)
      .set({ refreshToken: null, refreshTokenExpiresAt: null })
      .where(eq(users.id, userId));
  }
}
