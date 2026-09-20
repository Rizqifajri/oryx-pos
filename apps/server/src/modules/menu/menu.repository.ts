import { db } from "@dio-sys-be/db";
import { menus } from "@dio-sys-be/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";

// Soft-deleted menus (deletedAt set) are hidden from every menu lookup.
const notDeleted = isNull(menus.deletedAt);

export const findAllMenus = async () => {
  return await db.select().from(menus).where(notDeleted);
};

export const findMenusByTenantId = async (tenantId: string) => {
  return await db
    .select()
    .from(menus)
    .where(and(eq(menus.tenantId, tenantId), notDeleted));
};

export const findMenusByCategoryId = async (categoryId: string) => {
  return await db
    .select()
    .from(menus)
    .where(and(eq(menus.categoryId, categoryId), notDeleted));
};

export const findMenusByFilters = async (filters: {
  tenantId?: string;
  categoryId?: string;
  isAvailable?: boolean;
}) => {
  const conditions = [notDeleted];

  if (filters.tenantId) {
    conditions.push(eq(menus.tenantId, filters.tenantId));
  }
  if (filters.categoryId) {
    conditions.push(eq(menus.categoryId, filters.categoryId));
  }
  if (filters.isAvailable !== undefined) {
    conditions.push(eq(menus.isAvailable, filters.isAvailable));
  }

  return await db
    .select()
    .from(menus)
    .where(and(...conditions));
};

export const findMenuById = async (id: string) => {
  const result = await db
    .select()
    .from(menus)
    .where(and(eq(menus.id, id), notDeleted))
    .limit(1);
  return result[0] || null;
};

export const findMenusByIds = async (ids: string[]) => {
  return await db
    .select()
    .from(menus)
    .where(and(inArray(menus.id, ids), notDeleted));
};

export const createMenu = async (data: {
  tenantId: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  isAvailable: boolean;
}) => {
  const result = await db.insert(menus).values(data).returning();
  return result[0];
};

export const updateMenu = async (
  id: string,
  data: {
    categoryId?: string;
    name?: string;
    description?: string;
    price?: number;
    imageUrl?: string;
    isAvailable?: boolean;
  },
) => {
  const result = await db
    .update(menus)
    .set(data)
    .where(eq(menus.id, id))
    .returning();
  return result[0] || null;
};

export const bulkUpdateAvailability = async (
  menuIds: string[],
  isAvailable: boolean,
) => {
  const result = await db
    .update(menus)
    .set({ isAvailable })
    .where(inArray(menus.id, menuIds))
    .returning();
  return result;
};

/** Soft-deletes a menu by stamping deletedAt; the row is preserved. */
export const deleteMenu = async (id: string) => {
  const result = await db
    .update(menus)
    .set({ deletedAt: new Date() })
    .where(and(eq(menus.id, id), isNull(menus.deletedAt)))
    .returning();
  return result[0] || null;
};
