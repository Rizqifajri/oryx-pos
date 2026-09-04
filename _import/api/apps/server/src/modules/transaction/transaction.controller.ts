import type { RequestHandler } from "express";
import * as transactionService from "./transaction.service";
import type { CreateTransactionInput } from "./transaction.schema";

export const listTransactions: RequestHandler = async (req, res) => {
  const { tenantId } = req.query;

  const filters: { tenantId?: string } = {};

  if (tenantId && typeof tenantId === "string") {
    filters.tenantId = tenantId;
  }

  const data = await transactionService.listTransactions(req.user!, filters);
  res.json({ success: true, data });
};

export const getTransaction: RequestHandler<{ id: string }> = async (
  req,
  res,
) => {
  const data = await transactionService.getTransaction(req.user!, req.params.id);
  res.json({ success: true, data });
};

export const getTransactionByOrder: RequestHandler<{
  orderId: string;
}> = async (req, res) => {
  const data = await transactionService.getTransactionByOrder(
    req.user!,
    req.params.orderId,
  );
  res.json({ success: true, data });
};

export const createTransaction: RequestHandler<
  object,
  object,
  CreateTransactionInput
> = async (req, res) => {
  const data = await transactionService.createTransaction(req.user!, req.body);
  res.status(201).json({ success: true, data });
};

export const deleteTransaction: RequestHandler<{ id: string }> = async (
  req,
  res,
) => {
  await transactionService.deleteTransaction(req.user!, req.params.id);
  res.json({ success: true, message: "Transaction deleted successfully" });
};
