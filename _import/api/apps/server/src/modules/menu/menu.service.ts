import type { UserContext } from "@/types/user-context";
import { AppError } from "@/utils/app-error";
import { assertTenantMatch } from "@/utils/assert-permission";
import * as categoryRepo from "../category/category.repository";
import * as tenantRepo from "../tenant/tenant.repository";
import * as menuRepo from "./menu.repository";
import type {
  BulkUpdateAvailabilityInput,
  CreateMenuInput,
  UpdateMenuInput,
} from "./menu.schema";

export const listMenus = async (
  ctx: UserContext,
  filters?: { tenantId?: string; categoryId?: string; isAvailable?: boolean },
) => {
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

  return await menuRepo.findMenusByFilters(queryFilters);
};

export const getMenusByTenant = async (ctx: UserContext, tenantId: string) => {
  // Permission check now handled by route middleware
  if (ctx.scope === "TENANT") {
    if (!ctx.tenantId) {
      throw new AppError("Tenant context required", 400);
    }
    if (ctx.tenantId !== tenantId) {
      throw new AppError("You do not have access to this tenant", 403);
    }
  }

  const tenant = await tenantRepo.findTenantById(tenantId);
  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  return await menuRepo.findMenusByTenantId(tenantId);
};

export const getMenusByCategory = async (
  ctx: UserContext,
  categoryId: string,
) => {
  // Permission check now handled by route middleware
  const category = await categoryRepo.findCategoryById(categoryId);
  if (!category) {
    throw new AppError("Category not found", 404);
  }

  if (ctx.scope === "TENANT") {
    assertTenantMatch(ctx, category.tenantId);
  }

  return await menuRepo.findMenusByCategoryId(categoryId);
};

export const getMenu = async (ctx: UserContext, id: string) => {
  // Permission check now handled by route middleware
  const menu = await menuRepo.findMenuById(id);
  if (!menu) {
    throw new AppError("Menu not found", 404);
  }

  if (ctx.scope === "TENANT") {
    assertTenantMatch(ctx, menu.tenantId);
  }

  return menu;
};

export const createMenu = async (ctx: UserContext, input: CreateMenuInput) => {
  // Permission check now handled by route middleware
  if (ctx.scope === "TENANT") {
    if (!ctx.tenantId) {
      throw new AppError("Tenant context required", 400);
    }
    if (input.tenantId !== ctx.tenantId) {
      throw new AppError("You can only create menus in your own tenant", 403);
    }
  }

  const tenant = await tenantRepo.findTenantById(input.tenantId);
  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  const category = await categoryRepo.findCategoryById(input.categoryId);
  if (!category) {
    throw new AppError("Category not found", 404);
  }

  if (category.tenantId !== input.tenantId) {
    throw new AppError("Category does not belong to the specified tenant", 400);
  }

  return await menuRepo.createMenu({
    tenantId: input.tenantId,
    categoryId: input.categoryId,
    name: input.name,
    description: input.description,
    price: input.price,
    imageUrl: input.imageUrl,
    isAvailable: input.isAvailable,
  });
};

export const updateMenu = async (
  ctx: UserContext,
  id: string,
  input: UpdateMenuInput,
) => {
  // Permission check now handled by route middleware
  const menu = await menuRepo.findMenuById(id);
  if (!menu) {
    throw new AppError("Menu not found", 404);
  }

  if (ctx.scope === "TENANT") {
    assertTenantMatch(ctx, menu.tenantId);
  }

  if (input.categoryId) {
    const category = await categoryRepo.findCategoryById(input.categoryId);
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

  return await menuRepo.updateMenu(id, input);
};

export const toggleAvailability = async (
  ctx: UserContext,
  id: string,
  isAvailable: boolean,
) => {
  // Permission check now handled by route middleware
  const menu = await menuRepo.findMenuById(id);
  if (!menu) {
    throw new AppError("Menu not found", 404);
  }

  if (ctx.scope === "TENANT") {
    assertTenantMatch(ctx, menu.tenantId);
  }

  return await menuRepo.updateMenu(id, { isAvailable });
};

export const bulkUpdateAvailability = async (
  ctx: UserContext,
  input: BulkUpdateAvailabilityInput,
) => {
  // Permission check now handled by route middleware
  const menus = await menuRepo.findMenusByIds(input.menuIds);

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

  return await menuRepo.bulkUpdateAvailability(
    input.menuIds,
    input.isAvailable,
  );
};

export const deleteMenu = async (ctx: UserContext, id: string) => {
  // Permission check now handled by route middleware
  const menu = await menuRepo.findMenuById(id);
  if (!menu) {
    throw new AppError("Menu not found", 404);
  }

  if (ctx.scope === "TENANT") {
    assertTenantMatch(ctx, menu.tenantId);
  }

  return await menuRepo.deleteMenu(id);
};
