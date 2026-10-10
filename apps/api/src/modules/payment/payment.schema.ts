import { z } from "zod";

export const createPaymentSchema = z.object({
  orderId: z.string().uuid(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;

/**
 * Midtrans webhook notification schema
 * Reference: https://docs.midtrans.com/en/after-payment/http-notification
 */
export const midtransWebhookSchema = z.object({
  transaction_time: z.string(),
  transaction_status: z.string(),
  transaction_id: z.string(),
  status_message: z.string().optional(),
  status_code: z.string(),
  signature_key: z.string(),
  settlement_time: z.string().optional(),
  payment_type: z.string(),
  order_id: z.string(),
  merchant_id: z.string().optional(),
  gross_amount: z.string(),
  fraud_status: z.string().optional(),
  currency: z.string().optional(),
  // Additional fields depending on payment method
  acquirer: z.string().optional(),
  approval_code: z.string().optional(),
  card_type: z.string().optional(),
  bank: z.string().optional(),
  va_numbers: z.array(z.any()).optional(),
  bill_key: z.string().optional(),
  biller_code: z.string().optional(),
});

export type MidtransWebhookPayload = z.infer<typeof midtransWebhookSchema>;
