import { z } from "zod";

export const createRoleSchema = z
  .object({
    tenantId: z.string().uuid().nullable().optional(),
    name: z.string().min(1).max(100).trim(),
    scope: z.enum(["GLOBAL", "TENANT"]).default("TENANT"),
    permissionIds: z.array(z.string().uuid()).optional().default([]),
  })
  .refine(
    (data) => {
      // GLOBAL roles must have null tenantId
      if (data.scope === "GLOBAL") {
        return data.tenantId === null || data.tenantId === undefined;
      }
      // TENANT roles must have tenantId
      return data.tenantId !== null && data.tenantId !== undefined;
    },
    {
      message:
        "GLOBAL roles must have null tenantId, TENANT roles must have tenantId",
      path: ["tenantId"],
    }
  );

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  scope: z.enum(["GLOBAL", "TENANT"]).optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
