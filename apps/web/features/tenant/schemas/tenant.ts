import { z } from "zod"

export const createTenantSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Max 100 characters"),
  slug: z
    .string()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
})

export type CreateTenantValues = z.infer<typeof createTenantSchema>
