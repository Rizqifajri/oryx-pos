import { db } from "@dio-sys-be/db";
import { tenants } from "@dio-sys-be/db/schema";
import { eq } from "drizzle-orm";

export const findAllTenants = async () => {
  return await db.select().from(tenants);
};

export const findTenantById = async (id: string) => {
  const result = await db
    .select()
    .from(tenants)
    .where(eq(tenants.id, id))
    .limit(1);
  return result[0] || null;
};

export const findTenantBySlug = async (slug: string) => {
  const result = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);
  return result[0] || null;
};

export const createTenant = async (data: { name: string; slug: string }) => {
  const result = await db.insert(tenants).values(data).returning();
  return result[0];
};

export const updateTenant = async (
  id: string,
  data: { name?: string; slug?: string },
) => {
  const result = await db
    .update(tenants)
    .set(data)
    .where(eq(tenants.id, id))
    .returning();
  return result[0] || null;
};

export const deleteTenant = async (id: string) => {
  const result = await db.delete(tenants).where(eq(tenants.id, id)).returning();
  return result[0] || null;
};
