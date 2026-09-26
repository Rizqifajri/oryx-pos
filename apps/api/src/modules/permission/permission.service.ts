import { Injectable } from "@nestjs/common";
import { GLOBAL_ONLY_PERMISSIONS } from "../../common/constants/permissions";
import { AppError } from "../../common/errors/app-error";
import type { UserContext } from "../../common/types/user-context";
import { assertGlobalScope } from "../../common/utils/assert-permission";
import { PermissionRepository } from "./permission.repository";
import type {
  CreatePermissionInput,
  UpdatePermissionInput,
} from "./permission.schema";

@Injectable()
export class PermissionService {
  constructor(private readonly permissionRepo: PermissionRepository) {}

  async listPermissions(ctx: UserContext) {
    // Permission check now handled by route middleware
    const allPermissions = await this.permissionRepo.findAllPermissions();

    if (ctx.scope === "TENANT") {
      return allPermissions.filter((p) => !GLOBAL_ONLY_PERMISSIONS.has(p.name));
    }

    return allPermissions;
  }

  async getPermission(ctx: UserContext, id: string) {
    // Permission check now handled by route middleware
    const permission = await this.permissionRepo.findPermissionById(id);
    if (!permission) {
      throw new AppError("Permission not found", 404);
    }

    if (
      ctx.scope === "TENANT" &&
      GLOBAL_ONLY_PERMISSIONS.has(permission.name)
    ) {
      throw new AppError("Permission not found", 404);
    }

    return permission;
  }

  async createPermission(ctx: UserContext, input: CreatePermissionInput) {
    assertGlobalScope(ctx);
    // Permission check now handled by route middleware

    const existing = await this.permissionRepo.findPermissionByName(input.name);
    if (existing) {
      throw new AppError("Permission with this name already exists", 409);
    }

    return await this.permissionRepo.createPermission(input);
  }

  async updatePermission(
    ctx: UserContext,
    id: string,
    input: UpdatePermissionInput,
  ) {
    assertGlobalScope(ctx);
    // Permission check now handled by route middleware

    const permission = await this.permissionRepo.findPermissionById(id);
    if (!permission) {
      throw new AppError("Permission not found", 404);
    }

    if (input.name) {
      const existing = await this.permissionRepo.findPermissionByName(
        input.name,
      );
      if (existing && existing.id !== id) {
        throw new AppError("Permission with this name already exists", 409);
      }
    }

    return await this.permissionRepo.updatePermission(id, input);
  }

  async deletePermission(ctx: UserContext, id: string) {
    assertGlobalScope(ctx);
    // Permission check now handled by route middleware

    const permission = await this.permissionRepo.findPermissionById(id);
    if (!permission) {
      throw new AppError("Permission not found", 404);
    }

    return await this.permissionRepo.deletePermission(id);
  }
}
