import { db } from "@dio-sys-be/db";
import { tables } from "@dio-sys-be/db/schema";
import { and, eq } from "drizzle-orm";
import type { TableStatus } from "./table.schema";

export const findAllTables = async () => {
  return await db.select().from(tables);
};

export const findTablesByTenantId = async (tenantId: string) => {
  return await db
    .select()
    .from(tables)
    .where(eq(tables.tenantId, tenantId));
};

export const findTablesByTenantAndStatus = async (
  tenantId: string,
  status: TableStatus,
) => {
  return await db
    .select()
    .from(tables)
    .where(and(eq(tables.tenantId, tenantId), eq(tables.status, status)));
};

export const findTableById = async (id: string) => {
  const result = await db
    .select()
    .from(tables)
    .where(eq(tables.id, id))
    .limit(1);
  return result[0] || null;
};

export const createTable = async (data: {
  tenantId: string;
  name: string;
  capacity: number;
  status: TableStatus;
}) => {
  const result = await db.insert(tables).values(data).returning();
  return result[0];
};

export const updateTable = async (
  id: string,
  data: {
    name?: string;
    capacity?: number;
    status?: TableStatus;
  },
) => {
  const result = await db
    .update(tables)
    .set(data)
    .where(eq(tables.id, id))
    .returning();
  return result[0] || null;
};

export const deleteTable = async (id: string) => {
  const result = await db
    .delete(tables)
    .where(eq(tables.id, id))
    .returning();
  return result[0] || null;
};
