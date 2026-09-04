import type { UserContext } from "@/types/user-context";
import { AppError } from "@/utils/app-error";
import { assertTenantMatch } from "@/utils/assert-permission";
import * as orderRepo from "../order/order.repository";
import * as tableRepo from "../table/table.repository";
import * as transactionRepo from "./transaction.repository";
import type { CreateTransactionInput } from "./transaction.schema";

export const listTransactions = async (
  ctx: UserContext,
  filters?: { tenantId?: string },
) => {
  // Permission check now handled by route middleware
  
  // For TENANT scope: always use their tenant (ignore any provided tenantId)
  if (ctx.scope === "TENANT") {
    if (!ctx.tenantId) throw new AppError("Tenant context required", 400);
    return await transactionRepo.findTransactionsByTenantId(ctx.tenantId);
  }

  // For GLOBAL scope: use filter tenantId if provided
  if (filters?.tenantId) {
    return await transactionRepo.findTransactionsByTenantId(filters.tenantId);
  }

  return await transactionRepo.findAllTransactions();
};

export const getTransaction = async (ctx: UserContext, id: string) => {
  // Permission check now handled by route middleware
  const transaction = await transactionRepo.findTransactionById(id);
  if (!transaction) throw new AppError("Transaction not found", 404);

  if (ctx.scope === "TENANT") assertTenantMatch(ctx, transaction.tenantId);

  return transaction;
};

export const getTransactionByOrder = async (
  ctx: UserContext,
  orderId: string,
) => {
  // Permission check now handled by route middleware
  const order = await orderRepo.findOrderById(orderId);
  if (!order) throw new AppError("Order not found", 404);

  if (ctx.scope === "TENANT") assertTenantMatch(ctx, order.tenantId);

  const transaction = await transactionRepo.findTransactionByOrderId(orderId);
  if (!transaction) throw new AppError("Transaction not found for this order", 404);

  return transaction;
};

export const createTransaction = async (
  ctx: UserContext,
  input: CreateTransactionInput,
) => {
  // Permission check now handled by route middleware
  const order = await orderRepo.findOrderById(input.orderId);
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

  const existing = await transactionRepo.findTransactionByOrderId(input.orderId);
  if (existing) {
    throw new AppError("A transaction already exists for this order", 409);
  }

  const transaction = await transactionRepo.createTransaction({
    tenantId: order.tenantId,
    orderId: input.orderId,
    totalAmount: order.totalPrice,
    paymentMethod: input.paymentMethod,
  });

  // Only update table status if order has a table assigned
  if (order.tableId) {
    await tableRepo.updateTable(order.tableId, { status: "AVAILABLE" });
  }

  return transaction;
};

export const deleteTransaction = async (ctx: UserContext, id: string) => {
  // Permission check now handled by route middleware
  const transaction = await transactionRepo.findTransactionById(id);
  if (!transaction) throw new AppError("Transaction not found", 404);

  if (ctx.scope === "TENANT") assertTenantMatch(ctx, transaction.tenantId);

  return await transactionRepo.deleteTransaction(id);
};
