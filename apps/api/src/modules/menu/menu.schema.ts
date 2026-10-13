import { z } from "zod";

/** Image badge on the public table menu. */
export const menuBadgeEnum = z.enum(["chef_pick", "best_seller", "new", "spicy"]);

export const createMenuSchema = z.object({
  tenantId: z.string().uuid(),
  categoryId: z.string().uuid(),
  name: z.string().min(2).max(100).trim(),
  description: z.string().max(500).trim(),
  price: z.number().int().positive(),
  imageUrl: z.string().url(),
  isAvailable: z.boolean().default(true),
  isPopular: z.boolean().default(false),
  badge: menuBadgeEnum.nullable().optional(),
});

export const updateMenuSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().max(500).trim().optional(),
  price: z.number().int().positive().optional(),
  imageUrl: z.string().url().optional(),
  isAvailable: z.boolean().optional(),
  isPopular: z.boolean().optional(),
  badge: menuBadgeEnum.nullable().optional(),
});

export const toggleAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});

export const bulkUpdateAvailabilitySchema = z.object({
  menuIds: z.array(z.string().uuid()).min(1),
  isAvailable: z.boolean(),
});

export const menuQuerySchema = z.object({
  tenantId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  isAvailable: z
    .enum(["true", "false"])
    .transform((val) => val === "true")
    .optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
});

export type CreateMenuInput = z.infer<typeof createMenuSchema>;
export type UpdateMenuInput = z.infer<typeof updateMenuSchema>;
export type ToggleAvailabilityInput = z.infer<typeof toggleAvailabilitySchema>;
export type BulkUpdateAvailabilityInput = z.infer<
  typeof bulkUpdateAvailabilitySchema
>;
export type MenuQueryInput = z.infer<typeof menuQuerySchema>;
