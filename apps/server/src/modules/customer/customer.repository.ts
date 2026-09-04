import { db } from "@dio-sys-be/db";
import { customers } from "@dio-sys-be/db/schema";
import { and, eq } from "drizzle-orm";

export const findAllCustomers = async () => {
  return await db.select().from(customers);
};

export const findCustomersByTenantId = async (tenantId: string) => {
  return await db
    .select()
    .from(customers)
    .where(eq(customers.tenantId, tenantId));
};

export const findCustomerById = async (id: string) => {
  const result = await db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .limit(1);
  return result[0] || null;
};

export const findCustomerByPhoneAndTenant = async (
  phone: string,
  tenantId: string,
) => {
  const result = await db
    .select()
    .from(customers)
    .where(and(eq(customers.phone, phone), eq(customers.tenantId, tenantId)))
    .limit(1);
  return result[0] || null;
};

export const createCustomer = async (data: {
  tenantId: string;
  name: string;
  phone?: string | null;
  email?: string | null;
}) => {
  const result = await db.insert(customers).values(data).returning();
  return result[0];
};

export const updateCustomer = async (
  id: string,
  data: { name?: string; phone?: string | null; email?: string | null },
) => {
  const result = await db
    .update(customers)
    .set(data)
    .where(eq(customers.id, id))
    .returning();
  return result[0] || null;
};

export const deleteCustomer = async (id: string) => {
  const result = await db
    .delete(customers)
    .where(eq(customers.id, id))
    .returning();
  return result[0] || null;
};
