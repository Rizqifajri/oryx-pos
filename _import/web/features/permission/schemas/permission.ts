import { z } from "zod"

export const createPermissionSchema = z.object({
  name: z
    .string()
    .min(1, "Permission name is required")
    .max(100, "Max 100 characters")
    .regex(
      /^[a-z_]+:[a-z_]+$/,
      "Format must be 'resource:action' (e.g., user:read)"
    ),
})

export const updatePermissionSchema = z.object({
  name: z
    .string()
    .min(1, "Permission name is required")
    .max(100, "Max 100 characters")
    .regex(
      /^[a-z_]+:[a-z_]+$/,
      "Format must be 'resource:action' (e.g., user:read)"
    )
    .optional(),
})

export type CreatePermissionValues = z.infer<typeof createPermissionSchema>
export type UpdatePermissionValues = z.infer<typeof updatePermissionSchema>
