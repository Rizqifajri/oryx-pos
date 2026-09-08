import type { UserContext } from "@/types/user-context";
import { AppError } from "@/utils/app-error";
import { assertTenantMatch } from "@/utils/assert-permission";
import { computePriceBreakdown } from "@/utils/pricing";
import { db } from "@dio-sys-be/db";
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

  // Tax and service are computed server-side from the order subtotal so the
  // recorded amount is authoritative and can never be spoofed by the client.
  const breakdown = computePriceBreakdown(order.totalPrice);

  // Insert the transaction and free the table atomically — a failure between
  // the two must not leave a paid order sitting on an occupied table.
  return await db.transaction(async (tx) => {
    const transaction = await transactionRepo.createTransaction(
      {
        tenantId: order.tenantId,
        orderId: input.orderId,
        subtotal: breakdown.subtotal,
        taxAmount: breakdown.taxAmount,
        serviceAmount: breakdown.serviceAmount,
        totalAmount: breakdown.totalAmount,
        paymentMethod: input.paymentMethod,
      },
      tx,
    );

    // Only update table status if order has a table assigned
    if (order.tableId) {
      await tableRepo.updateTable(order.tableId, { status: "AVAILABLE" }, tx);
    }

    return transaction;
  });
};

export const deleteTransaction = async (ctx: UserContext, id: string) => {
  // Permission check now handled by route middleware
  const transaction = await transactionRepo.findTransactionById(id);
  if (!transaction) throw new AppError("Transaction not found", 404);

  if (ctx.scope === "TENANT") assertTenantMatch(ctx, transaction.tenantId);

  return await transactionRepo.deleteTransaction(id);
};
