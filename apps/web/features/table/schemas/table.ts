import { z } from "zod"

export const tableStatusEnum = z.enum(["AVAILABLE", "OCCUPIED"])

export const createTableSchema = z.object({
  tenantId: z.string().uuid("Invalid tenant ID"),
  name: z.string().min(1, "Table name is required").max(100, "Table name is too long"),
  capacity: z.number().int("Capacity must be an integer").min(1, "Capacity must be at least 1").max(100, "Capacity cannot exceed 100"),
  status: tableStatusEnum,
})

export const updateTableSchema = z.object({
  name: z.string().min(1, "Table name is required").max(100, "Table name is too long").optional(),
  capacity: z.number().int("Capacity must be an integer").min(1, "Capacity must be at least 1").max(100, "Capacity cannot exceed 100").optional(),
  status: tableStatusEnum.optional(),
})

export const updateTableStatusSchema = z.object({
  status: tableStatusEnum,
})

export type CreateTableValues = z.infer<typeof createTableSchema>
export type UpdateTableValues = z.infer<typeof updateTableSchema>
export type UpdateTableStatusInput = z.infer<typeof updateTableStatusSchema>
