import type { UserContext } from "@/types/user-context";
import { AppError } from "@/utils/app-error";
import { assertTenantMatch } from "@/utils/assert-permission";
import * as tenantRepo from "../tenant/tenant.repository";
import * as categoryRepo from "./category.repository";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./category.schema";

export const listCategories = async (
  ctx: UserContext,
  filters?: { tenantId?: string },
) => {
  // Permission check now handled by route middleware

  // For TENANT scope: always use their tenant (ignore any provided tenantId)
  if (ctx.scope === "TENANT") {
    if (!ctx.tenantId) {
      throw new AppError("Tenant context required", 400);
    }
    return await categoryRepo.findCategoriesByTenantId(ctx.tenantId);
  }

  // For GLOBAL scope: use filter tenantId if provided
  if (filters?.tenantId) {
    return await categoryRepo.findCategoriesByTenantId(filters.tenantId);
  }

  return await categoryRepo.findAllCategories();
};

export const getCategoriesByTenant = async (
  ctx: UserContext,
  tenantId: string,
) => {
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

  return await categoryRepo.findCategoriesByTenantId(tenantId);
};

export const getCategory = async (ctx: UserContext, id: string) => {
  // Permission check now handled by route middleware

  const category = await categoryRepo.findCategoryById(id);
  if (!category) {
    throw new AppError("Category not found", 404);
  }

  if (ctx.scope === "TENANT") {
    assertTenantMatch(ctx, category.tenantId);
  }

  return category;
};

export const createCategory = async (
  ctx: UserContext,
  input: CreateCategoryInput,
) => {
  // Permission check now handled by route middleware

  if (ctx.scope === "TENANT") {
    if (!ctx.tenantId) {
      throw new AppError("Tenant context required", 400);
    }
    if (input.tenantId !== ctx.tenantId) {
      throw new AppError(
        "You can only create categories in your own tenant",
        403,
      );
    }
  }

  const tenant = await tenantRepo.findTenantById(input.tenantId);
  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  return await categoryRepo.createCategory({
    tenantId: input.tenantId,
    name: input.name,
  });
};

export const updateCategory = async (
  ctx: UserContext,
  id: string,
  input: UpdateCategoryInput,
) => {
  // Permission check now handled by route middleware

  const category = await categoryRepo.findCategoryById(id);
  if (!category) {
    throw new AppError("Category not found", 404);
  }

  if (ctx.scope === "TENANT") {
    assertTenantMatch(ctx, category.tenantId);
  }

  return await categoryRepo.updateCategory(id, input);
};

export const deleteCategory = async (ctx: UserContext, id: string) => {
  // Permission check now handled by route middleware

  const category = await categoryRepo.findCategoryById(id);
  if (!category) {
    throw new AppError("Category not found", 404);
  }

  if (ctx.scope === "TENANT") {
    assertTenantMatch(ctx, category.tenantId);
  }

  return await categoryRepo.deleteCategory(id);
};
