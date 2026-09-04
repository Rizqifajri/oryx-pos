import { z } from "zod";

export const createCategorySchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(2).max(100).trim(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
