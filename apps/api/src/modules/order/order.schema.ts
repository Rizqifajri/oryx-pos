import { z } from "zod";

export const orderStatusEnum = z.enum([
  "NEW",
  "PROCESSING",
  "COMPLETED",
  "CANCELED",
]);

export const orderItemInputSchema = z.object({
  menuId: z.string().uuid(),
  quantity: z.number().int().min(1),
});

export const createOrderSchema = z.object({
  tenantId: z.string().uuid(),
  tableId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional(),
  customerName: z.string().min(2).max(100).trim().optional(),
  customerPhone: z.string().min(5).max(20).trim().optional(),
  paymentMethod: z.string().min(1).max(50).trim().optional(),
  items: z.array(orderItemInputSchema).min(1),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["PROCESSING", "COMPLETED", "CANCELED"]),
});

export type OrderStatus = z.infer<typeof orderStatusEnum>;
export type OrderItemInput = z.infer<typeof orderItemInputSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
