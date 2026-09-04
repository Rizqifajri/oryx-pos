import { z } from "zod"

export const createRoleSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Max 100 characters"),
  permissions: z.array(z.string()).min(1, "Select at least one permission"),
})

export type CreateRoleValues = z.infer<typeof createRoleSchema>
