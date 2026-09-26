import { z } from "zod";

export const createMenuSchema = z.object({
  tenantId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().min(2).max(100).trim(),
  description: z.string().max(500).trim(),
  price: z.number().int().positive(),
  imageUrl: z.string().url(),
  isAvailable: z.boolean().default(true),
});

export const updateMenuSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(500).trim().optional(),
  price: z.number().int().positive().optional(),
  imageUrl: z.string().url().optional(),
  isAvailable: z.boolean().optional(),
});

export const toggleAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export const bulkUpdateAvailabilitySchema = z.object({
  menuIds: z.array(z.string().uuid()).min(1),
  isAvailable: z.boolean(),
});

export type CreateMenuInput = z.infer<typeof createMenuSchema>;
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;
export type ToggleAvailabilityInput = z.infer<typeof toggleAvailabilitySchema>;
export type BulkUpdateAvailabilityInput = z.infer<
  typeof bulkUpdateAvailabilitySchema
>;
