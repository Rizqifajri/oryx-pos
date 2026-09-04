import { db } from "@dio-sys-be/db";
import { menus } from "@dio-sys-be/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export const findAllMenus = async () => {
  return await db.select().from(menus);
};

export const findMenusByTenantId = async (tenantId: string) => {
  return await db.select().from(menus).where(eq(menus.tenantId, tenantId));
};

export const findMenusByCategoryId = async (categoryId: string) => {
  return await db
    .select()
    .from(menus)
    .where(eq(menus.categoryId, categoryId));
};

export const findMenusByFilters = async (filters: {
  tenantId?: string;
  categoryId?: string;
  isAvailable?: boolean;
}) => {
  const conditions = [];

  if (filters.tenantId) {
    conditions.push(eq(menus.tenantId, filters.tenantId));
  }
  if (filters.categoryId) {
    conditions.push(eq(menus.categoryId, filters.categoryId));
  }
  if (filters.isAvailable !== undefined) {
    conditions.push(eq(menus.isAvailable, filters.isAvailable));
  }

  if (conditions.length === 0) {
    return await db.select().from(menus);
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
    .where(eq(menus.id, id))
    .limit(1);
  return result[0] || null;
};

export const findMenusByIds = async (ids: string[]) => {
  return await db.select().from(menus).where(inArray(menus.id, ids));
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

export const deleteMenu = async (id: string) => {
  const result = await db.delete(menus).where(eq(menus.id, id)).returning();
  return result[0] || null;
};
