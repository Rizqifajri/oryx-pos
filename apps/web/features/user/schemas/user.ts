import { z } from "zod"

export const createUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Minimum 8 characters"),
  roleId: z.string().min(1, "Select a role"),
})

export const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  roleId: z.string().min(1, "Select a role"),
  password: z.string().min(8, "Minimum 8 characters").or(z.literal("")).optional(),
})

export type CreateUserValues = z.infer<typeof createUserSchema>
export type UpdateUserValues = z.infer<typeof updateUserSchema>
