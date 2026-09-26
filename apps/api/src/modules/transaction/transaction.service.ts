import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@dio-sys-be/db";
import { AppError } from "../../common/errors/app-error";
import type { UserContext } from "../../common/types/user-context";
import { assertTenantMatch } from "../../common/utils/assert-permission";
import { computePriceBreakdown } from "../../common/utils/pricing";
import { DRIZZLE } from "../../database/database.module";
import { OrderRepository } from "../order/order.repository";
import { TableRepository } from "../table/table.repository";
import { TransactionRepository } from "./transaction.repository";
import type { CreateTransactionInput } from "./transaction.schema";

@Injectable()
export class TransactionService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly transactionRepo: TransactionRepository,
    private readonly orderRepo: OrderRepository,
    private readonly tableRepo: TableRepository,
  ) {}

  async listTransactions(ctx: UserContext, filters?: { tenantId?: string }) {
    // Permission check now handled by route middleware

    // For TENANT scope: always use their tenant (ignore any provided tenantId)
    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) throw new AppError("Tenant context required", 400);
      return await this.transactionRepo.findTransactionsByTenantId(ctx.tenantId);
    }

    // For GLOBAL scope: use filter tenantId if provided
    if (filters?.tenantId) {
      return await this.transactionRepo.findTransactionsByTenantId(
        filters.tenantId,
      );
    }

    return await this.transactionRepo.findAllTransactions();
  }

  async getTransaction(ctx: UserContext, id: string) {
    // Permission check now handled by route middleware
    const transaction = await this.transactionRepo.findTransactionById(id);
    if (!transaction) throw new AppError("Transaction not found", 404);

    if (ctx.scope === "TENANT") assertTenantMatch(ctx, transaction.tenantId);

    return transaction;
  }

  async getTransactionByOrder(ctx: UserContext, orderId: string) {
    // Permission check now handled by route middleware
    const order = await this.orderRepo.findOrderById(orderId);
    if (!order) throw new AppError("Order not found", 404);

    if (ctx.scope === "TENANT") assertTenantMatch(ctx, order.tenantId);

    const transaction =
      await this.transactionRepo.findTransactionByOrderId(orderId);
    if (!transaction)
      throw new AppError("Transaction not found for this order", 404);

    return transaction;
  }

  async createTransaction(ctx: UserContext, input: CreateTransactionInput) {
    // Permission check now handled by route middleware
    const order = await this.orderRepo.findOrderById(input.orderId);
    if (!order) throw new AppError("Order not found", 404);

    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) throw new AppError("Tenant context required", 400);
      assertTenantMatch(ctx, order.tenantId);
    }

    if (order.status !== "COMPLETED") {
      throw new AppError(
        "Transaction can only be created for COMPLETED orders",
        400,
      );
    }

    const existing = await this.transactionRepo.findTransactionByOrderId(
      input.orderId,
    );
    if (existing) {
      throw new AppError("A transaction already exists for this order", 409);
    }

    // Tax and service are computed server-side from the order subtotal so the
    // recorded amount is authoritative and can never be spoofed by the client.
    const breakdown = computePriceBreakdown(order.totalPrice);

    // Payment method: an explicit choice at settlement wins, otherwise use the
    // method the cashier picked when the order was created, then default to cash.
    const paymentMethod = input.paymentMethod ?? order.paymentMethod ?? "cash";

    // Insert the transaction and free the table atomically — a failure between
    // the two must not leave a paid order sitting on an occupied table.
    return await this.db.transaction(async (tx) => {
      const transaction = await this.transactionRepo.createTransaction(
        {
          tenantId: order.tenantId,
          orderId: input.orderId,
          subtotal: breakdown.subtotal,
          taxAmount: breakdown.taxAmount,
          serviceAmount: breakdown.serviceAmount,
          totalAmount: breakdown.totalAmount,
          paymentMethod,
        },
        tx,
      );

      // Only update table status if order has a table assigned
      if (order.tableId) {
        await this.tableRepo.updateTable(
          order.tableId,
          { status: "AVAILABLE" },
          tx,
        );
      }

      return transaction;
    });
  }

  async deleteTransaction(ctx: UserContext, id: string) {
    // Permission check now handled by route middleware
    const transaction = await this.transactionRepo.findTransactionById(id);
    if (!transaction) throw new AppError("Transaction not found", 404);

    if (ctx.scope === "TENANT") assertTenantMatch(ctx, transaction.tenantId);

    return await this.transactionRepo.deleteTransaction(id);
  }
}
