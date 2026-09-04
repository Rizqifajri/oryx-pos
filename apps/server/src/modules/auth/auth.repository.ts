import { db } from "@dio-sys-be/db";
import {
  permissions,
  rolePermissions,
  roles,
  tenants,
  users,
} from "@dio-sys-be/db/schema";
import { eq } from "drizzle-orm";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export const findUserByEmail = async (email: string) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0] ?? null;
};

export const findUserById = async (id: string) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return result[0] ?? null;
};

export const findTenantBySlug = async (slug: string) => {
  const result = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);
  return result[0] ?? null;
};

export const createTenant = async (
  data: { name: string; slug: string },
  tx: Transaction,
) => {
  const [tenant] = await tx.insert(tenants).values(data).returning();
  if (!tenant) throw new Error("Failed to create tenant");
  return tenant;
};

export const createRole = async (
  data: { tenantId: string; name: string; scope: "GLOBAL" | "TENANT" },
  tx: Transaction,
) => {
  const [role] = await tx.insert(roles).values(data).returning();
  if (!role) throw new Error("Failed to create role");
  return role;
};

export const findAllPermissions = async (tx: Transaction) => {
  return tx.select().from(permissions);
};

export const createRolePermissions = async (
  rows: { roleId: string; permissionId: string }[],
  tx: Transaction,
) => {
  if (rows.length === 0) return;
  await tx.insert(rolePermissions).values(rows);
};

export const createUser = async (
  data: {
    tenantId: string;
    roleId: string;
    name: string;
    email: string;
    password: string;
  },
  tx: Transaction,
) => {
  const [user] = await tx.insert(users).values(data).returning();
  if (!user) throw new Error("Failed to create user");
  return user;
};

export const findTenantById = async (id: string) => {
  const result = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1);
  return result[0] ?? null;
};

export const findRoleWithPermissions = async (roleId: string) => {
  const roleResult = await db
    .select()
    .from(roles)
    .where(eq(roles.id, roleId))
    .limit(1);

  if (!roleResult[0]) return null;

  const perms = await db
    .select({ name: permissions.name })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, roleId));

  return {
    ...roleResult[0],
    permissions: perms.map((p) => p.name),
  };
};

export const updateUserRefreshToken = async (
  userId: string,
  refreshToken: string,
  expiresAt: Date,
) => {
  const [user] = await db
    .update(users)
    .set({ refreshToken, refreshTokenExpiresAt: expiresAt })
    .where(eq(users.id, userId))
    .returning();
  return user;
};

export const findUserByRefreshToken = async (refreshToken: string) => {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.refreshToken, refreshToken))
    .limit(1);
  return result[0] ?? null;
};

export const clearUserRefreshToken = async (userId: string) => {
  await db
    .update(users)
    .set({ refreshToken: null, refreshTokenExpiresAt: null })
    .where(eq(users.id, userId));
};
