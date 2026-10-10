import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { GlobalScopeGuard } from "../../common/guards/global-scope.guard";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { UserContext } from "../../common/types/user-context";
import {
  type CreatePermissionInput,
  createPermissionSchema,
  type UpdatePermissionInput,
  updatePermissionSchema,
} from "./permission.schema";
import { PermissionService } from "./permission.service";

@Controller("permissions")
export class PermissionController {
  constructor(private readonly permissionService: PermissionService) {}

  // Read operations - accessible by authenticated users with permissions
  @Get()
  @RequirePermissions("permission:list")
  async listPermissions(@CurrentUser() user: UserContext) {
    const permissions = await this.permissionService.listPermissions(user);
    return {
      success: true,
      data: permissions,
    };
  }

  @Get(":id")
  @RequirePermissions("permission:view")
  async getPermission(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
  ) {
    const permission = await this.permissionService.getPermission(user, id);
    return {
      success: true,
      data: permission,
    };
  }

  // Write operations - GLOBAL-only
  @Post()
  @UseGuards(GlobalScopeGuard)
  async createPermission(
    @CurrentUser() user: UserContext,
    @Body(new ZodValidationPipe(createPermissionSchema))
    body: CreatePermissionInput,
  ) {
    const permission = await this.permissionService.createPermission(user, body);
    return {
      success: true,
      data: permission,
    };
  }

  @Patch(":id")
  @UseGuards(GlobalScopeGuard)
  async updatePermission(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updatePermissionSchema))
    body: UpdatePermissionInput,
  ) {
    const permission = await this.permissionService.updatePermission(
      user,
      id,
      body,
    );
    return {
      success: true,
      data: permission,
    };
  }

  @Delete(":id")
  @UseGuards(GlobalScopeGuard)
  async deletePermission(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
  ) {
    await this.permissionService.deletePermission(user, id);
    return {
      success: true,
      message: "Permission deleted successfully",
    };
  }
}
