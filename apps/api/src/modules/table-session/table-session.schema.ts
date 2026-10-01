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
  "move_table",
]);

export const createServiceRequestSchema = z.object({
  type: serviceRequestTypeEnum,
  // e.g. "pindah ke area outdoor" for move_table
  note: z.string().trim().max(200).optional(),
});

const shareLabel = z.string().trim().max(40).optional();

/** Split a bill evenly, by items (every unit assigned once), or by amounts. */
export const splitBillSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("equal"), count: z.number().int().min(2).max(20) }),
  z.object({
    mode: z.literal("items"),
    shares: z
      .array(
        z.object({
          label: shareLabel,
          items: z
            .array(
              z.object({
                orderItemId: z.string().uuid(),
                quantity: z.number().int().min(0).max(50),
              }),
            )
            .max(200),
        }),
      )
      .min(2)
      .max(20),
  }),
  z.object({
    mode: z.literal("custom"),
    // Integer cents.
    shares: z
      .array(z.object({ label: shareLabel, amount: z.number().int().positive() }))
      .min(2)
      .max(20),
  }),
]);

export const payShareSchema = z.object({
  paymentMethod: z.string().trim().min(1).max(50),
});

export const transferSessionSchema = z.object({
  toTableId: z.string().uuid(),
});

export const mergeSessionSchema = z.object({
  intoSessionId: z.string().uuid(),
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
export type SplitBillInput = z.infer<typeof splitBillSchema>;
export type PayShareInput = z.infer<typeof payShareSchema>;
export type TransferSessionInput = z.infer<typeof transferSessionSchema>;
export type MergeSessionInput = z.infer<typeof mergeSessionSchema>;
