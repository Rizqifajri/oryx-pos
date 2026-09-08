import type { RequestHandler } from "express";
import * as orderService from "./order.service";
import type {
  CreateOrderInput,
  OrderStatus,
  PublicCreateOrderInput,
  UpdateOrderStatusInput,
} from "./order.schema";

export const listOrders: RequestHandler = async (req, res) => {
  const { tenantId, status, tableId } = req.query;
  const filters: { tenantId?: string; status?: OrderStatus; tableId?: string } = {};

  if (tenantId && typeof tenantId === "string") {
    filters.tenantId = tenantId;
  }

  if (
    status === "NEW" ||
    status === "PROCESSING" ||
    status === "COMPLETED" ||
    status === "CANCELED"
  ) {
    filters.status = status as OrderStatus;
  }

  if (tableId && typeof tableId === "string") {
    filters.tableId = tableId;
  }

  const data = await orderService.listOrders(req.user!, filters);
  res.json({ success: true, data });
};

export const getOrder: RequestHandler<{ id: string }> = async (req, res) => {
  const data = await orderService.getOrder(req.user!, req.params.id);
  res.json({ success: true, data });
};

export const createOrder: RequestHandler<
  object,
  object,
  CreateOrderInput
> = async (req, res) => {
  const data = await orderService.createOrder(req.user!, req.body);
  res.status(201).json({ success: true, data });
};

export const updateOrderStatus: RequestHandler<
  { id: string },
  object,
  UpdateOrderStatusInput
> = async (req, res) => {
  const data = await orderService.updateOrderStatus(
    req.user!,
    req.params.id,
    req.body,
  );
  res.json({ success: true, data });
};

export const deleteOrder: RequestHandler<{ id: string }> = async (req, res) => {
  await orderService.deleteOrder(req.user!, req.params.id);
  res.json({ success: true, message: "Order deleted successfully" });
};

export const getPublicMenu: RequestHandler = async (req, res) => {
  const { tableId } = req.query;
  if (!tableId || typeof tableId !== "string") {
    res.status(400).json({ success: false, message: "tableId is required" });
    return;
  }
  const data = await orderService.getPublicMenu(tableId);
  res.json({ success: true, data });
};

export const createPublicOrder: RequestHandler<
  object,
  object,
  PublicCreateOrderInput
> = async (req, res) => {
  const data = await orderService.createPublicOrder(req.body);
  res.status(201).json({ success: true, data });
};
