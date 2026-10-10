import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/require-permissions.decorator";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import type { UserContext } from "../../common/types/user-context";
import {
  type BulkUpdateAvailabilityInput,
  bulkUpdateAvailabilitySchema,
  type CreateMenuInput,
  createMenuSchema,
  type ToggleAvailabilityInput,
  toggleAvailabilitySchema,
  type UpdateMenuInput,
  updateMenuSchema,
} from "./menu.schema";
import { MenuService } from "./menu.service";

@Controller("menus")
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  @Get()
  @RequirePermissions("menu:list")
  async listMenus(
    @CurrentUser() user: UserContext,
    @Query("tenantId") tenantId?: string,
    @Query("categoryId") categoryId?: string,
    @Query("isAvailable") isAvailable?: string,
  ) {
    const filters: {
      tenantId?: string;
      categoryId?: string;
      isAvailable?: boolean;
    } = {};

    if (tenantId && typeof tenantId === "string") {
      filters.tenantId = tenantId;
    }

    if (categoryId && typeof categoryId === "string") {
      filters.categoryId = categoryId;
    }

    if (isAvailable !== undefined) {
      filters.isAvailable = isAvailable === "true";
    }

    const menus = await this.menuService.listMenus(user, filters);
    return {
      success: true,
      data: menus,
    };
  }

  @Get("tenant/:tenantId")
  @RequirePermissions("menu:list")
  async getMenusByTenant(
    @CurrentUser() user: UserContext,
    @Param("tenantId") tenantId: string,
  ) {
    const menus = await this.menuService.getMenusByTenant(user, tenantId);
    return {
      success: true,
      data: menus,
    };
  }

  @Get("category/:categoryId")
  @RequirePermissions("menu:list")
  async getMenusByCategory(
    @CurrentUser() user: UserContext,
    @Param("categoryId") categoryId: string,
  ) {
    const menus = await this.menuService.getMenusByCategory(user, categoryId);
    return {
      success: true,
      data: menus,
    };
  }

  @Get(":id")
  @RequirePermissions("menu:view")
  async getMenu(@CurrentUser() user: UserContext, @Param("id") id: string) {
    const menu = await this.menuService.getMenu(user, id);
    return {
      success: true,
      data: menu,
    };
  }

  @Post()
  @RequirePermissions("menu:manage", "menu:create")
  async createMenu(
    @CurrentUser() user: UserContext,
    @Body(new ZodValidationPipe(createMenuSchema)) body: CreateMenuInput,
  ) {
    const menu = await this.menuService.createMenu(user, body);
    return {
      success: true,
      data: menu,
    };
  }

  // MUST precede PATCH :id/availability — otherwise "bulk" is captured as :id
  // and this route becomes unreachable.
  @Patch("bulk/availability")
  @RequirePermissions("menu:manage", "menu:update")
  async bulkUpdateAvailability(
    @CurrentUser() user: UserContext,
    @Body(new ZodValidationPipe(bulkUpdateAvailabilitySchema))
    body: BulkUpdateAvailabilityInput,
  ) {
    const menus = await this.menuService.bulkUpdateAvailability(user, body);
    return {
      success: true,
      data: menus,
    };
  }

  @Patch(":id/availability")
  @RequirePermissions("menu:manage", "menu:update")
  async toggleAvailability(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(toggleAvailabilitySchema))
    body: ToggleAvailabilityInput,
  ) {
    const menu = await this.menuService.toggleAvailability(
      user,
      id,
      body.isAvailable,
    );
    return {
      success: true,
      data: menu,
    };
  }

  @Patch(":id")
  @RequirePermissions("menu:manage", "menu:update")
  async updateMenu(
    @CurrentUser() user: UserContext,
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateMenuSchema)) body: UpdateMenuInput,
  ) {
    const menu = await this.menuService.updateMenu(user, id, body);
    return {
      success: true,
      data: menu,
    };
  }

  @Delete(":id")
  @RequirePermissions("menu:manage", "menu:delete")
  async deleteMenu(@CurrentUser() user: UserContext, @Param("id") id: string) {
    await this.menuService.deleteMenu(user, id);
    return {
      success: true,
      message: "Menu deleted successfully",
    };
  }
}
