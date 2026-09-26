import { Injectable } from "@nestjs/common";
import { AppError } from "../../common/errors/app-error";
import type { UserContext } from "../../common/types/user-context";
import { assertTenantMatch } from "../../common/utils/assert-permission";
import { TenantRepository } from "../tenant/tenant.repository";
import { CategoryRepository } from "./category.repository";
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
} from "./category.schema";

@Injectable()
export class CategoryService {
  constructor(
    private readonly categoryRepo: CategoryRepository,
    private readonly tenantRepo: TenantRepository,
  ) {}

  async listCategories(ctx: UserContext, filters?: { tenantId?: string }) {
    // Permission check now handled by route middleware

    // For TENANT scope: always use their tenant (ignore any provided tenantId)
    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) {
        throw new AppError("Tenant context required", 400);
      }
      return await this.categoryRepo.findCategoriesByTenantId(ctx.tenantId);
    }

    // For GLOBAL scope: use filter tenantId if provided
    if (filters?.tenantId) {
      return await this.categoryRepo.findCategoriesByTenantId(filters.tenantId);
    }

    return await this.categoryRepo.findAllCategories();
  }

  async getCategoriesByTenant(ctx: UserContext, tenantId: string) {
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

    return await this.categoryRepo.findCategoriesByTenantId(tenantId);
  }

  async getCategory(ctx: UserContext, id: string) {
    // Permission check now handled by route middleware

    const category = await this.categoryRepo.findCategoryById(id);
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    if (ctx.scope === "TENANT") {
      assertTenantMatch(ctx, category.tenantId);
    }

    return category;
  }

  async createCategory(ctx: UserContext, input: CreateCategoryInput) {
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

    const tenant = await this.tenantRepo.findTenantById(input.tenantId);
    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }

    return await this.categoryRepo.createCategory({
      tenantId: input.tenantId,
      name: input.name,
    });
  }

  async updateCategory(
    ctx: UserContext,
    id: string,
    input: UpdateCategoryInput,
  ) {
    // Permission check now handled by route middleware

    const category = await this.categoryRepo.findCategoryById(id);
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    if (ctx.scope === "TENANT") {
      assertTenantMatch(ctx, category.tenantId);
    }

    return await this.categoryRepo.updateCategory(id, input);
  }

  async deleteCategory(ctx: UserContext, id: string) {
    // Permission check now handled by route middleware

    const category = await this.categoryRepo.findCategoryById(id);
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    if (ctx.scope === "TENANT") {
      assertTenantMatch(ctx, category.tenantId);
    }

    return await this.categoryRepo.deleteCategory(id);
  }
}
