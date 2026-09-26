import { Inject, Injectable } from "@nestjs/common";
import type { Db, DbOrTx } from "@dio-sys-be/db";
import { transactions } from "@dio-sys-be/db/schema";
import { eq } from "drizzle-orm";
import { DRIZZLE } from "../../database/database.module";

@Injectable()
export class TransactionRepository {
  constructor(@Inject(DRIZZLE) private readonly db: Db) {}

  async findAllTransactions() {
    return await this.db.select().from(transactions);
  }

  async findTransactionsByTenantId(tenantId: string) {
    return await this.db
      .select()
      .from(transactions)
      .where(eq(transactions.tenantId, tenantId));
  }

  async findTransactionById(id: string) {
    const result = await this.db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id))
      .limit(1);
    return result[0] || null;
  }

  async findTransactionByOrderId(orderId: string) {
    const result = await this.db
      .select()
      .from(transactions)
      .where(eq(transactions.orderId, orderId))
      .limit(1);
    return result[0] || null;
  }

  async createTransaction(
    data: {
      tenantId: string;
      orderId: string;
      subtotal: number;
      taxAmount: number;
      serviceAmount: number;
      totalAmount: number;
      paymentMethod: string;
      paymentRequestId?: string;
      midtransTransactionId?: string;
    },
    tx: DbOrTx = this.db,
  ) {
    const result = await tx.insert(transactions).values(data).returning();
    return result[0];
  }

  async deleteTransaction(id: string) {
    const result = await this.db
      .delete(transactions)
      .where(eq(transactions.id, id))
      .returning();
    return result[0] || null;
  }
}
