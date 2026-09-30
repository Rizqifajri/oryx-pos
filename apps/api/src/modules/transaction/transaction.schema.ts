import { z } from "zod";

export const createTransactionSchema = z.object({
  orderId: z.string().uuid(),
  // Optional: falls back to the method chosen on the order at POS time,
  // then to "cash" for QR/self-service orders.
  paymentMethod: z.string().min(1).max(50).trim().optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
