import { z } from "zod";

export const createCustomerSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(2).max(100).trim(),
  phone: z.string().min(5).max(20).trim().optional(),
  email: z.string().email().toLowerCase().trim().optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  phone: z.string().min(5).max(20).trim().optional(),
  email: z.string().email().toLowerCase().trim().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
