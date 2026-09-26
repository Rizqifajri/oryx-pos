import { Injectable } from "@nestjs/common";
import { AppError } from "../../common/errors/app-error";
import { deleteFromR2ByUrl } from "../../common/lib/r2";
import type { UserContext } from "../../common/types/user-context";
import { assertTenantMatch } from "../../common/utils/assert-permission";
import { CategoryRepository } from "../category/category.repository";
import { TenantRepository } from "../tenant/tenant.repository";
import { MenuRepository } from "./menu.repository";
import type {
  BulkUpdateAvailabilityInput,
  CreateMenuInput,
  UpdateMenuInput,
} from "./menu.schema";

@Injectable()
export class MenuService {
  constructor(
    private readonly menuRepo: MenuRepository,
    private readonly categoryRepo: CategoryRepository,
    private readonly tenantRepo: TenantRepository,
  ) {}

  async listMenus(
    ctx: UserContext,
    filters?: { tenantId?: string; categoryId?: string; isAvailable?: boolean },
  ) {
    // Permission check now handled by route middleware
    const queryFilters: {
      tenantId?: string;
      categoryId?: string;
      isAvailable?: boolean;
    } = {};

    // For TENANT scope: always use their tenant (ignore any provided tenantId)
    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) {
        throw new AppError("Tenant context required", 400);
      }
      queryFilters.tenantId = ctx.tenantId;
    }
    // For GLOBAL scope: use filter tenantId if provided
    else if (filters?.tenantId) {
      queryFilters.tenantId = filters.tenantId;
    }

    if (filters?.categoryId) {
      queryFilters.categoryId = filters.categoryId;
    }

    if (filters?.isAvailable !== undefined) {
      queryFilters.isAvailable = filters.isAvailable;
    }

    return await this.menuRepo.findMenusByFilters(queryFilters);
  }

  async getMenusByTenant(ctx: UserContext, tenantId: string) {
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

    return await this.menuRepo.findMenusByTenantId(tenantId);
  }

  async getMenusByCategory(ctx: UserContext, categoryId: string) {
    // Permission check now handled by route middleware
    const category = await this.categoryRepo.findCategoryById(categoryId);
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    if (ctx.scope === "TENANT") {
      assertTenantMatch(ctx, category.tenantId);
    }

    return await this.menuRepo.findMenusByCategoryId(categoryId);
  }

  async getMenu(ctx: UserContext, id: string) {
    // Permission check now handled by route middleware
    const menu = await this.menuRepo.findMenuById(id);
    if (!menu) {
      throw new AppError("Menu not found", 404);
    }

    if (ctx.scope === "TENANT") {
      assertTenantMatch(ctx, menu.tenantId);
    }

    return menu;
  }

  async createMenu(ctx: UserContext, input: CreateMenuInput) {
    // Permission check now handled by route middleware
    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) {
        throw new AppError("Tenant context required", 400);
      }
      if (input.tenantId !== ctx.tenantId) {
        throw new AppError("You can only create menus in your own tenant", 403);
      }
    }

    const tenant = await this.tenantRepo.findTenantById(input.tenantId);
    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }

    const category = await this.categoryRepo.findCategoryById(input.categoryId);
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    if (category.tenantId !== input.tenantId) {
      throw new AppError(
        "Category does not belong to the specified tenant",
        400,
      );
    }

    return await this.menuRepo.createMenu({
      tenantId: input.tenantId,
      categoryId: input.categoryId,
      name: input.name,
      description: input.description,
      price: input.price,
      imageUrl: input.imageUrl,
      isAvailable: input.isAvailable,
    });
  }

  async updateMenu(ctx: UserContext, id: string, input: UpdateMenuInput) {
    // Permission check now handled by route middleware
    const menu = await this.menuRepo.findMenuById(id);
    if (!menu) {
      throw new AppError("Menu not found", 404);
    }

    if (ctx.scope === "TENANT") {
      assertTenantMatch(ctx, menu.tenantId);
    }

    if (input.categoryId) {
      const category = await this.categoryRepo.findCategoryById(
        input.categoryId,
      );
      if (!category) {
        throw new AppError("Category not found", 404);
      }
      if (category.tenantId !== menu.tenantId) {
        throw new AppError(
          "Category does not belong to the same tenant as the menu",
          400,
        );
      }
    }

    const updated = await this.menuRepo.updateMenu(id, input);

    // If the image was replaced, clean up the previous object in R2.
    // Best-effort: failures here are logged, not thrown.
    if (
      input.imageUrl !== undefined &&
      menu.imageUrl &&
      menu.imageUrl !== input.imageUrl
    ) {
      await deleteFromR2ByUrl(menu.imageUrl);
    }

    return updated;
  }

  async toggleAvailability(
    ctx: UserContext,
    id: string,
    isAvailable: boolean,
  ) {
    // Permission check now handled by route middleware
    const menu = await this.menuRepo.findMenuById(id);
    if (!menu) {
      throw new AppError("Menu not found", 404);
    }

    if (ctx.scope === "TENANT") {
      assertTenantMatch(ctx, menu.tenantId);
    }

    return await this.menuRepo.updateMenu(id, { isAvailable });
  }

  async bulkUpdateAvailability(
    ctx: UserContext,
    input: BulkUpdateAvailabilityInput,
  ) {
    // Permission check now handled by route middleware
    const menus = await this.menuRepo.findMenusByIds(input.menuIds);

    if (menus.length !== input.menuIds.length) {
      throw new AppError("One or more menus not found", 404);
    }

    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) {
        throw new AppError("Tenant context required", 400);
      }

      const allBelongToTenant = menus.every(
        (menu) => menu.tenantId === ctx.tenantId,
      );
      if (!allBelongToTenant) {
        throw new AppError(
          "All menus must belong to your tenant for bulk operations",
          403,
        );
      }
    }

    return await this.menuRepo.bulkUpdateAvailability(
      input.menuIds,
      input.isAvailable,
    );
  }

  async deleteMenu(ctx: UserContext, id: string) {
    // Permission check now handled by route middleware
    const menu = await this.menuRepo.findMenuById(id);
    if (!menu) {
      throw new AppError("Menu not found", 404);
    }

    if (ctx.scope === "TENANT") {
      assertTenantMatch(ctx, menu.tenantId);
    }

    // Soft delete: the row stays (order history joins to it for the menu name)
    // but it disappears from every menu listing. The image is kept for the same
    // reason. Never fails on FK relations the way a hard delete did.
    return await this.menuRepo.deleteMenu(id);
  }
}
