import { z } from "zod";

export const createTransactionSchema = z.object({
  orderId: z.string().uuid(),
  paymentMethod: z.string().min(1).max(50).trim(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
