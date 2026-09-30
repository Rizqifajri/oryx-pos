import { z } from "zod";

export const createTenantSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  slug: z.string().min(2).max(100).trim().optional(),
});

export const updateTenantSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  slug: z.string().min(2).max(100).trim().optional(),
  // Public table menu: subtitle, and whether guests can place orders.
  tagline: z.string().max(120).trim().nullable().optional(),
  isOpen: z.boolean().optional(),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
