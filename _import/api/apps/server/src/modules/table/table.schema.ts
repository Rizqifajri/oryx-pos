import { z } from "zod";

export const tableStatusEnum = z.enum(["AVAILABLE", "OCCUPIED"]);

export const createTableSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(50).trim(),
  capacity: z.number().int().positive(),
  status: tableStatusEnum.default("AVAILABLE"),
});

export const updateTableSchema = z.object({
  name: z.string().min(1).max(50).trim().optional(),
  capacity: z.number().int().positive().optional(),
  status: tableStatusEnum.optional(),
});

export const updateTableStatusSchema = z.object({
  status: tableStatusEnum,
});

export type TableStatus = z.infer<typeof tableStatusEnum>;
export type CreateTableInput = z.infer<typeof createTableSchema>;
export type UpdateTableInput = z.infer<typeof updateTableSchema>;
export type UpdateTableStatusInput = z.infer<typeof updateTableStatusSchema>;
