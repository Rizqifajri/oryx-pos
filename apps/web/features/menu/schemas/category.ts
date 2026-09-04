import { z } from "zod"

export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Max 100 characters"),
})

export const updateCategorySchema = createCategorySchema.partial()

export type CreateCategoryValues = z.infer<typeof createCategorySchema>
export type UpdateCategoryValues = z.infer<typeof updateCategorySchema>
