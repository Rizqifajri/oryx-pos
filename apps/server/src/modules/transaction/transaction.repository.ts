import { db } from "@dio-sys-be/db";
import { transactions } from "@dio-sys-be/db/schema";
import { eq } from "drizzle-orm";

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const findAllTransactions = async () => {
  return await db.select().from(transactions);
};

export const findTransactionsByTenantId = async (tenantId: string) => {
  return await db
    .select()
    .from(transactions)
    .where(eq(transactions.tenantId, tenantId));
};

export const findTransactionById = async (id: string) => {
  const result = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, id))
    .limit(1);
  return result[0] || null;
};

export const findTransactionByOrderId = async (orderId: string) => {
  const result = await db
    .select()
    .from(transactions)
    .where(eq(transactions.orderId, orderId))
    .limit(1);
  return result[0] || null;
};

export const createTransaction = async (
  data: {
    tenantId: string;
    orderId: string;
    subtotal: number;
    taxAmount: number;
    serviceAmount: number;
    totalAmount: number;
    paymentMethod: string;
  },
  tx: DbOrTx = db,
) => {
  const result = await tx.insert(transactions).values(data).returning();
  return result[0];
};

export const deleteTransaction = async (id: string) => {
  const result = await db
    .delete(transactions)
    .where(eq(transactions.id, id))
    .returning();
  return result[0] || null;
};
