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
  type CreateTenantInput,
  createTenantSchema,
  type UpdateTenantInput,
  updateTenantSchema,
} from "./tenant.schema";
import { TenantService } from "./tenant.service";

@Controller("tenants")
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  // List tenants - accessible by both GLOBAL and TENANT scoped users
  // GLOBAL users see all tenants, TENANT users see only their own
  @Get()
  @RequirePermissions("tenant:list")
  async listTenants(@CurrentUser() user: UserContext) {
    const tenants = await this.tenantService.listTenants(user);
    return {
      success: true,
      data: tenants,
    };
  }

  // The three /me routes must be declared before their /:id siblings or "me"
  // would be captured as an id.
  @Get("me")
  // requirePermission("tenant:view") is intentionally not applied — it was
  // commented out in tenant.routes.ts.
  async getMyTenant(@CurrentUser() user: UserContext) {
    const tenant = await this.tenantService.getMyTenant(user);
    return {
      success: true,
      data: tenant,
    };
  }

  @Patch("me")
  @RequirePermissions("tenant:manage-own")
  async updateMyTenant(
    @CurrentUser() user: UserContext,
    @Body(new ZodValidationPipe(updateTenantSchema)) body: UpdateTenantInput,
  ) {
    const tenant = await this.tenantService.updateMyTenant(user, body);
    return {
      success: true,
      data: tenant,
    };
  }

  @Delete("me")
  @RequirePermissions("tenant:manage-own")
  async deleteMyTenant(@CurrentUser() user: UserContext) {
    await this.tenantService.deleteMyTenant(user);
    return {
      success: true,
      message: "Tenant deleted successfully",
    };
  }

  // GLOBAL-only operations
  @Get(":id")
  @UseGuards(GlobalScopeGuard)
  async getTenant(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
  ) {
    const tenant = await this.tenantService.getTenant(user, id);
    return {
      success: true,
      data: tenant,
    };
  }

  @Post()
  @UseGuards(GlobalScopeGuard)
  async createTenant(
    @CurrentUser() user: UserContext,
    @Body(new ZodValidationPipe(createTenantSchema)) body: CreateTenantInput,
  ) {
    const tenant = await this.tenantService.createTenant(user, body);
    return {
      success: true,
      data: tenant,
    };
  }

  @Patch(":id")
  @UseGuards(GlobalScopeGuard)
  async updateTenant(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTenantSchema)) body: UpdateTenantInput,
  ) {
    const tenant = await this.tenantService.updateTenant(user, id, body);
    return {
      success: true,
      data: tenant,
    };
  }

  @Delete(":id")
  @UseGuards(GlobalScopeGuard)
  async deleteTenant(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
  ) {
    await this.tenantService.deleteTenant(user, id);
    return {
      success: true,
      message: "Tenant deleted successfully",
    };
  }
}
