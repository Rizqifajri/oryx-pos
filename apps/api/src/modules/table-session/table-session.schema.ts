import { z } from "zod";

export const createSessionOrderSchema = z.object({
  lines: z
    .array(
      z.object({
        menuId: z.string().uuid(),
        quantity: z.number().int().min(1).max(50),
        note: z.string().trim().max(200).optional(),
        // Price the guest saw (cents). Display-only: the server re-prices and
        // rejects the order with PRICE_CHANGED if this no longer matches.
        unitPrice: z.number().int().nonnegative().optional(),
      }),
    )
    .min(1)
    .max(50),
  note: z.string().trim().max(300).optional(),
});

export const lockBillSchema = z.object({
  method: z.enum(["online", "cashier"]),
});

export const createBillPaymentSchema = lockBillSchema;

export const serviceRequestTypeEnum = z.enum([
  "call_waiter",
  "water",
  "cutlery",
  "bill",
]);

export const createServiceRequestSchema = z.object({
  type: serviceRequestTypeEnum,
});

export const settleSessionSchema = z.object({
  paymentMethod: z.string().trim().min(1).max(50),
});

export const closeSessionSchema = z.object({
  reason: z.string().trim().max(200).optional(),
  // Closing a session that still has unpaid orders voids them from the bill.
  force: z.boolean().optional(),
});

export type CreateSessionOrderInput = z.infer<typeof createSessionOrderSchema>;
export type LockBillInput = z.infer<typeof lockBillSchema>;
export type CreateBillPaymentInput = z.infer<typeof createBillPaymentSchema>;
export type CreateServiceRequestInput = z.infer<typeof createServiceRequestSchema>;
export type SettleSessionInput = z.infer<typeof settleSessionSchema>;
export type CloseSessionInput = z.infer<typeof closeSessionSchema>;
