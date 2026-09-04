import { db } from "@dio-sys-be/db";
import { categories } from "@dio-sys-be/db/schema";
import { eq } from "drizzle-orm";

export const findAllCategories = async () => {
  return await db.select().from(categories);
};

export const findCategoriesByTenantId = async (tenantId: string) => {
  return await db
    .select()
    .from(categories)
    .where(eq(categories.tenantId, tenantId));
};

export const findCategoryById = async (id: string) => {
  const result = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return result[0] || null;
};

export const createCategory = async (data: {
  tenantId: string;
  name: string;
}) => {
  const result = await db.insert(categories).values(data).returning();
  return result[0];
};

export const updateCategory = async (id: string, data: { name?: string }) => {
  const result = await db
    .update(categories)
    .set(data)
    .where(eq(categories.id, id))
    .returning();
  return result[0] || null;
};

export const deleteCategory = async (id: string) => {
  const result = await db
    .delete(categories)
    .where(eq(categories.id, id))
    .returning();
  return result[0] || null;
};
