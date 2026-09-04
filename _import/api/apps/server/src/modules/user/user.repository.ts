import { db } from "@dio-sys-be/db";
import { users } from "@dio-sys-be/db/schema";
import { eq } from "drizzle-orm";

const safeUserFields = {
  id: users.id,
  tenantId: users.tenantId,
  roleId: users.roleId,
  name: users.name,
  email: users.email,
  createdAt: users.createdAt,
};

export const findAllUsers = async () => {
  return await db.select(safeUserFields).from(users);
};

export const findUsersByTenantId = async (tenantId: string) => {
  return await db
    .select(safeUserFields)
    .from(users)
    .where(eq(users.tenantId, tenantId));
};

export const findUserById = async (id: string) => {
  const result = await db
    .select(safeUserFields)
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  return result[0] || null;
};

export const findUserByEmail = async (email: string) => {
  const result = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0] || null;
};

export const createUser = async (data: {
  tenantId: string;
  roleId: string;
  name: string;
  email: string;
  password: string;
}) => {
  const result = await db.insert(users).values(data).returning(safeUserFields);
  return result[0];
};

export const updateUser = async (
  id: string,
  data: { name?: string; email?: string; password?: string; roleId?: string },
) => {
  const result = await db
    .update(users)
    .set(data)
    .where(eq(users.id, id))
    .returning(safeUserFields);
  return result[0] || null;
};

export const deleteUser = async (id: string) => {
  const result = await db
    .delete(users)
    .where(eq(users.id, id))
    .returning({ id: users.id, name: users.name, email: users.email });
  return result[0] || null;
};
