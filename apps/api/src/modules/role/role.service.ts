import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@dio-sys-be/db";
import { GLOBAL_ONLY_PERMISSIONS } from "../../common/constants/permissions";
import { AppError } from "../../common/errors/app-error";
import type { UserContext } from "../../common/types/user-context";
import { assertTenantMatch } from "../../common/utils/assert-permission";
import { DRIZZLE } from "../../database/database.module";
import { PermissionRepository } from "../permission/permission.repository";
import { TenantRepository } from "../tenant/tenant.repository";
import { RoleRepository } from "./role.repository";
import type { CreateRoleInput, UpdateRoleInput } from "./role.schema";

@Injectable()
export class RoleService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly roleRepo: RoleRepository,
    private readonly permissionRepo: PermissionRepository,
    private readonly tenantRepo: TenantRepository,
  ) {}

  async listRoles(ctx: UserContext) {
    // Permission check now handled by route middleware
    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) {
        throw new AppError("Tenant context required", 400);
      }
      return await this.roleRepo.findRolesByTenantId(ctx.tenantId);
    }

    return await this.roleRepo.findAllRoles();
  }

  async getRolesByTenant(ctx: UserContext, tenantId: string) {
    // Permission check now handled by route middleware
    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) {
        throw new AppError("Tenant context required", 400);
      }
      if (ctx.tenantId !== tenantId) {
        throw new AppError("You do not have access to this tenant", 403);
      }
    }

    const tenant = await this.tenantRepo.findTenantById(tenantId);
    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }

    return await this.roleRepo.findRolesByTenantId(tenantId);
  }

  async getRole(ctx: UserContext, id: string) {
    // Permission check now handled by route middleware
    const role = await this.roleRepo.findRoleById(id);
    if (!role) {
      throw new AppError("Role not found", 404);
    }

    if (ctx.scope === "TENANT") {
      assertTenantMatch(ctx, role.tenantId);
    }

    return role;
  }

  async createRole(ctx: UserContext, input: CreateRoleInput) {
    // Permission check now handled by route middleware

    // Handle GLOBAL scope roles
    if (input.scope === "GLOBAL") {
      // Only GLOBAL users can create GLOBAL roles
      if (ctx.scope !== "GLOBAL") {
        throw new AppError(
          "Only GLOBAL admins can create GLOBAL-scoped roles",
          403,
        );
      }
      // GLOBAL roles must have null tenantId
      input.tenantId = null;
    } else {
      // TENANT scope roles
      if (ctx.scope === "TENANT") {
        if (!ctx.tenantId) {
          throw new AppError("Tenant context required", 400);
        }
        // For TENANT users, use their tenantId if not provided
        if (!input.tenantId) {
          input.tenantId = ctx.tenantId;
        }
        if (input.tenantId !== ctx.tenantId) {
          throw new AppError(
            "You can only create roles in your own tenant",
            403,
          );
        }
      }

      // TENANT roles must have tenantId
      if (!input.tenantId) {
        throw new AppError("TENANT roles must have a tenantId", 400);
      }

      // Validate tenant exists
      const tenant = await this.tenantRepo.findTenantById(input.tenantId);
      if (!tenant) {
        throw new AppError("Tenant not found", 404);
      }
    }

    if (input.permissionIds.length > 0) {
      const perms = await this.permissionRepo.findPermissionsByIds(
        input.permissionIds,
      );
      if (perms.length !== input.permissionIds.length) {
        throw new AppError("One or more permissions not found", 404);
      }
      if (ctx.scope === "TENANT") {
        const forbidden = perms.find((p) =>
          GLOBAL_ONLY_PERMISSIONS.has(p.name),
        );
        if (forbidden) {
          throw new AppError(
            `Permission "${forbidden.name}" cannot be assigned to TENANT-scoped roles`,
            403,
          );
        }
      }
    }

    return await this.db.transaction(async (tx) => {
      const role = await this.roleRepo.createRole(
        {
          tenantId: input.tenantId as string,
          name: input.name,
          scope: input.scope,
        },
        tx,
      );

      if (input.permissionIds.length > 0) {
        await this.roleRepo.syncRolePermissions(
          role!.id,
          input.permissionIds,
          tx,
        );
      }

      return role!;
    });
  }

  async updateRole(ctx: UserContext, id: string, input: UpdateRoleInput) {
    // Permission check now handled by route middleware
    const role = await this.roleRepo.findRoleById(id);
    if (!role) {
      throw new AppError("Role not found", 404);
    }

    if (ctx.scope === "TENANT") {
      assertTenantMatch(ctx, role.tenantId);
      if (input.scope === "GLOBAL") {
        throw new AppError(
          "TENANT users cannot change role scope to GLOBAL",
          403,
        );
      }
    }

    if (input.permissionIds) {
      const perms = await this.permissionRepo.findPermissionsByIds(
        input.permissionIds,
      );
      if (perms.length !== input.permissionIds.length) {
        throw new AppError("One or more permissions not found", 404);
      }
      if (ctx.scope === "TENANT") {
        const forbidden = perms.find((p) =>
          GLOBAL_ONLY_PERMISSIONS.has(p.name),
        );
        if (forbidden) {
          throw new AppError(
            `Permission "${forbidden.name}" cannot be assigned to TENANT-scoped roles`,
            403,
          );
        }
      }
    }

    return await this.db.transaction(async (tx) => {
      const updated = await this.roleRepo.updateRole(
        id,
        {
          name: input.name,
          scope: input.scope,
        },
        tx,
      );

      if (input.permissionIds) {
        await this.roleRepo.syncRolePermissions(id, input.permissionIds, tx);
      }

      return updated!;
    });
  }

  async deleteRole(ctx: UserContext, id: string) {
    // Permission check now handled by route middleware
    const role = await this.roleRepo.findRoleById(id);
    if (!role) {
      throw new AppError("Role not found", 404);
    }

    if (ctx.scope === "TENANT") {
      assertTenantMatch(ctx, role.tenantId);
    }

    return await this.roleRepo.deleteRole(id);
  }
}
