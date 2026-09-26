import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { UserContext } from "../../common/types/user-context";
import {
  type CreateRoleInput,
  createRoleSchema,
  type UpdateRoleInput,
  updateRoleSchema,
} from "./role.schema";
import { RoleService } from "./role.service";

@Controller("roles")
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @RequirePermissions("role:list")
  async listRoles(@CurrentUser() user: UserContext) {
    const roles = await this.roleService.listRoles(user);
    return {
      success: true,
      data: roles,
    };
  }

  @Get("tenant/:tenantId")
  @RequirePermissions("role:list")
  async getRolesByTenant(
    @CurrentUser() user: UserContext,
    @Param("tenantId") tenantId: string,
  ) {
    const roles = await this.roleService.getRolesByTenant(user, tenantId);
    return {
      success: true,
      data: roles,
    };
  }

  @Get(":id")
  @RequirePermissions("role:view")
  async getRole(@CurrentUser() user: UserContext, @Param("id") id: string) {
    const role = await this.roleService.getRole(user, id);
    return {
      success: true,
      data: role,
    };
  }

  @Post()
  @RequirePermissions("role:manage", "role:create")
  async createRole(
    @CurrentUser() user: UserContext,
    @Body(new ZodValidationPipe(createRoleSchema)) body: CreateRoleInput,
  ) {
    const role = await this.roleService.createRole(user, body);
    return {
      success: true,
      data: role,
    };
  }

  @Patch(":id")
  @RequirePermissions("role:manage", "role:update")
  async updateRole(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateRoleSchema)) body: UpdateRoleInput,
  ) {
    const role = await this.roleService.updateRole(user, id, body);
    return {
      success: true,
      data: role,
    };
  }

  @Delete(":id")
  @RequirePermissions("role:manage", "role:delete")
  async deleteRole(@CurrentUser() user: UserContext, @Param("id") id: string) {
    await this.roleService.deleteRole(user, id);
    return {
      success: true,
      message: "Role deleted successfully",
    };
  }
}
