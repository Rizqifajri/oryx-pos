import { Injectable } from "@nestjs/common";
import { AppError } from "../../common/errors/app-error";
import type { UserContext } from "../../common/types/user-context";
import { assertGlobalScope } from "../../common/utils/assert-permission";
import { TenantRepository } from "./tenant.repository";
import type { CreateTenantInput, UpdateTenantInput } from "./tenant.schema";

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const generateRandomSuffix = (length: number): string => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

@Injectable()
export class TenantService {
  constructor(private readonly tenantRepo: TenantRepository) {}

  async listTenants(ctx: UserContext) {
    // Permission check now handled by route middleware

    // GLOBAL users see all tenants, TENANT users see only their own
    if (ctx.scope === "GLOBAL") {
      return await this.tenantRepo.findAllTenants();
    } else {
      // TENANT scope - return only their own tenant
      if (!ctx.tenantId) {
        throw new AppError("Tenant ID is required for tenant-scoped users", 400);
      }
      const tenant = await this.tenantRepo.findTenantById(ctx.tenantId);
      if (!tenant) {
        throw new AppError("Tenant not found", 404);
      }
      return [tenant]; // Return as array to match the expected format
    }
  }

  async getTenant(ctx: UserContext, id: string) {
    assertGlobalScope(ctx);
    // Permission check now handled by route middleware

    const tenant = await this.tenantRepo.findTenantById(id);
    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }
    return tenant;
  }

  async getMyTenant(ctx: UserContext) {
    // Permission check now handled by route middleware

    if (!ctx.tenantId) {
      throw new AppError("Tenant context required", 400);
    }

    const tenant = await this.tenantRepo.findTenantById(ctx.tenantId);
    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }
    return tenant;
  }

  async createTenant(ctx: UserContext, input: CreateTenantInput) {
    assertGlobalScope(ctx);
    // Permission check now handled by route middleware

    let slug = input.slug || generateSlug(input.name);
    let slugExists = await this.tenantRepo.findTenantBySlug(slug);
    let retries = 0;

    while (slugExists && retries < 3) {
      slug = `${generateSlug(input.name)}-${generateRandomSuffix(4)}`;
      slugExists = await this.tenantRepo.findTenantBySlug(slug);
      retries++;
    }

    if (slugExists) {
      throw new AppError(
        "Unable to create tenant, please try a different name or slug",
        409,
      );
    }

    return await this.tenantRepo.createTenant({ name: input.name, slug });
  }

  async updateTenant(ctx: UserContext, id: string, input: UpdateTenantInput) {
    assertGlobalScope(ctx);
    // Permission check now handled by route middleware

    const tenant = await this.tenantRepo.findTenantById(id);
    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }

    if (input.slug) {
      const existing = await this.tenantRepo.findTenantBySlug(input.slug);
      if (existing && existing.id !== id) {
        throw new AppError("Slug already in use", 409);
      }
    }

    return await this.tenantRepo.updateTenant(id, input);
  }

  async updateMyTenant(ctx: UserContext, input: UpdateTenantInput) {
    // Permission check now handled by route middleware

    if (!ctx.tenantId) {
      throw new AppError("Tenant context required", 400);
    }

    const tenant = await this.tenantRepo.findTenantById(ctx.tenantId);
    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }

    if (input.slug) {
      const existing = await this.tenantRepo.findTenantBySlug(input.slug);
      if (existing && existing.id !== ctx.tenantId) {
        throw new AppError("Slug already in use", 409);
      }
    }

    return await this.tenantRepo.updateTenant(ctx.tenantId, input);
  }

  async deleteTenant(ctx: UserContext, id: string) {
    assertGlobalScope(ctx);
    // Permission check now handled by route middleware

    const tenant = await this.tenantRepo.findTenantById(id);
    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }

    return await this.tenantRepo.deleteTenant(id);
  }

  async deleteMyTenant(ctx: UserContext) {
    // Permission check now handled by route middleware

    if (!ctx.tenantId) {
      throw new AppError("Tenant context required", 400);
    }

    const tenant = await this.tenantRepo.findTenantById(ctx.tenantId);
    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }

    return await this.tenantRepo.deleteTenant(ctx.tenantId);
  }
}
