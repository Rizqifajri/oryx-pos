import { GLOBAL_ONLY_PERMISSIONS } from "@/constants/permissions";
import type { UserContext } from "@/types/user-context";
import { AppError } from "@/utils/app-error";
import { assertGlobalScope } from "@/utils/assert-permission";
import * as permissionRepo from "./permission.repository";
import type {
  CreatePermissionInput,
  UpdatePermissionInput,
} from "./permission.schema";

export const listPermissions = async (ctx: UserContext) => {
  // Permission check now handled by route middleware
  const allPermissions = await permissionRepo.findAllPermissions();

  if (ctx.scope === "TENANT") {
    return allPermissions.filter((p) => !GLOBAL_ONLY_PERMISSIONS.has(p.name));
  }

  return allPermissions;
};

export const getPermission = async (ctx: UserContext, id: string) => {
  // Permission check now handled by route middleware
  const permission = await permissionRepo.findPermissionById(id);
  if (!permission) {
    throw new AppError("Permission not found", 404);
  }

  if (ctx.scope === "TENANT" && GLOBAL_ONLY_PERMISSIONS.has(permission.name)) {
    throw new AppError("Permission not found", 404);
  }

  return permission;
};

export const createPermission = async (
  ctx: UserContext,
  input: CreatePermissionInput,
) => {
  assertGlobalScope(ctx);
  // Permission check now handled by route middleware

  const existing = await permissionRepo.findPermissionByName(input.name);
  if (existing) {
    throw new AppError("Permission with this name already exists", 409);
  }

  return await permissionRepo.createPermission(input);
};

export const updatePermission = async (
  ctx: UserContext,
  id: string,
  input: UpdatePermissionInput,
) => {
  assertGlobalScope(ctx);
  // Permission check now handled by route middleware

  const permission = await permissionRepo.findPermissionById(id);
  if (!permission) {
    throw new AppError("Permission not found", 404);
  }

  if (input.name) {
    const existing = await permissionRepo.findPermissionByName(input.name);
    if (existing && existing.id !== id) {
      throw new AppError("Permission with this name already exists", 409);
    }
  }

  return await permissionRepo.updatePermission(id, input);
};

export const deletePermission = async (ctx: UserContext, id: string) => {
  assertGlobalScope(ctx);
  // Permission check now handled by route middleware

  const permission = await permissionRepo.findPermissionById(id);
  if (!permission) {
    throw new AppError("Permission not found", 404);
  }

  return await permissionRepo.deletePermission(id);
};
