import { z } from "zod";

export const createPermissionSchema = z.object({
  name: z.string().min(1).max(100).trim(),
});

export const updatePermissionSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
});

export type CreatePermissionInput = z.infer<typeof createPermissionSchema>;
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>;
