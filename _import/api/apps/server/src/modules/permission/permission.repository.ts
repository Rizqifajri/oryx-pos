import { db } from "@dio-sys-be/db";
import { permissions } from "@dio-sys-be/db/schema";
import { eq, inArray } from "drizzle-orm";

export const findAllPermissions = async () => {
  return await db.select().from(permissions);
};

export const findPermissionById = async (id: string) => {
  const result = await db
    .select()
    .from(permissions)
    .where(eq(permissions.id, id))
    .limit(1);
  return result[0] || null;
};

export const findPermissionsByIds = async (ids: string[]) => {
  if (ids.length === 0) return [];
  return await db.select().from(permissions).where(inArray(permissions.id, ids));
};

export const findPermissionByName = async (name: string) => {
  const result = await db
    .select()
    .from(permissions)
    .where(eq(permissions.name, name))
    .limit(1);
  return result[0] || null;
};

export const createPermission = async (data: { name: string }) => {
  const result = await db.insert(permissions).values(data).returning();
  return result[0];
};

export const updatePermission = async (
  id: string,
  data: { name?: string },
) => {
  const result = await db
    .update(permissions)
    .set(data)
    .where(eq(permissions.id, id))
    .returning();
  return result[0] || null;
};

export const deletePermission = async (id: string) => {
  const result = await db
    .delete(permissions)
    .where(eq(permissions.id, id))
    .returning();
  return result[0] || null;
};
