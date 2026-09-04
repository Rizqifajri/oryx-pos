import { z } from "zod"

export const createMenuSchema = z.object({
  categoryId: z.string().uuid("Select a category"),
  name: z.string().min(2, "Min 2 characters").max(100, "Max 100 characters"),
  description: z.string().max(500, "Max 500 characters").optional(),
  // User enters decimal (e.g. 12.50) — converted to cents in the hook
  price: z.coerce.number().positive("Price must be greater than 0"),
  imageUrl: z.string().url().or(z.literal("")).optional(),
  isAvailable: z.boolean().default(true),
})

export const updateMenuSchema = createMenuSchema.partial()

export const toggleAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
})

export type CreateMenuValues = z.infer<typeof createMenuSchema>
export type UpdateMenuValues = z.infer<typeof updateMenuSchema>
