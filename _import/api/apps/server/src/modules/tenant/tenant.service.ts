import type { UserContext } from "@/types/user-context";
import { AppError } from "@/utils/app-error";
import { assertGlobalScope } from "@/utils/assert-permission";
import * as tenantRepo from "./tenant.repository";
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

export const listTenants = async (ctx: UserContext) => {
  // Permission check now handled by route middleware
  
  // GLOBAL users see all tenants, TENANT users see only their own
  if (ctx.scope === "GLOBAL") {
    return await tenantRepo.findAllTenants();
  } else {
    // TENANT scope - return only their own tenant
    if (!ctx.tenantId) {
      throw new AppError("Tenant ID is required for tenant-scoped users", 400);
    }
    const tenant = await tenantRepo.findTenantById(ctx.tenantId);
    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }
    return [tenant]; // Return as array to match the expected format
  }
};

export const getTenant = async (ctx: UserContext, id: string) => {
  assertGlobalScope(ctx);
  // Permission check now handled by route middleware

  const tenant = await tenantRepo.findTenantById(id);
  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }
  return tenant;
};

export const getMyTenant = async (ctx: UserContext) => {
  // Permission check now handled by route middleware

  if (!ctx.tenantId) {
    throw new AppError("Tenant context required", 400);
  }

  const tenant = await tenantRepo.findTenantById(ctx.tenantId);
  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }
  return tenant;
};

export const createTenant = async (
  ctx: UserContext,
  input: CreateTenantInput,
) => {
  assertGlobalScope(ctx);
  // Permission check now handled by route middleware

  let slug = input.slug || generateSlug(input.name);
  let slugExists = await tenantRepo.findTenantBySlug(slug);
  let retries = 0;

  while (slugExists && retries < 3) {
    slug = `${generateSlug(input.name)}-${generateRandomSuffix(4)}`;
    slugExists = await tenantRepo.findTenantBySlug(slug);
    retries++;
  }

  if (slugExists) {
    throw new AppError(
      "Unable to create tenant, please try a different name or slug",
      409,
    );
  }

  return await tenantRepo.createTenant({ name: input.name, slug });
};

export const updateTenant = async (
  ctx: UserContext,
  id: string,
  input: UpdateTenantInput,
) => {
  assertGlobalScope(ctx);
  // Permission check now handled by route middleware

  const tenant = await tenantRepo.findTenantById(id);
  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  if (input.slug) {
    const existing = await tenantRepo.findTenantBySlug(input.slug);
    if (existing && existing.id !== id) {
      throw new AppError("Slug already in use", 409);
    }
  }

  return await tenantRepo.updateTenant(id, input);
};

export const updateMyTenant = async (
  ctx: UserContext,
  input: UpdateTenantInput,
) => {
  // Permission check now handled by route middleware

  if (!ctx.tenantId) {
    throw new AppError("Tenant context required", 400);
  }

  const tenant = await tenantRepo.findTenantById(ctx.tenantId);
  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  if (input.slug) {
    const existing = await tenantRepo.findTenantBySlug(input.slug);
    if (existing && existing.id !== ctx.tenantId) {
      throw new AppError("Slug already in use", 409);
    }
  }

  return await tenantRepo.updateTenant(ctx.tenantId, input);
};

export const deleteTenant = async (ctx: UserContext, id: string) => {
  assertGlobalScope(ctx);
  // Permission check now handled by route middleware

  const tenant = await tenantRepo.findTenantById(id);
  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  return await tenantRepo.deleteTenant(id);
};

export const deleteMyTenant = async (ctx: UserContext) => {
  // Permission check now handled by route middleware

  if (!ctx.tenantId) {
    throw new AppError("Tenant context required", 400);
  }

  const tenant = await tenantRepo.findTenantById(ctx.tenantId);
  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  return await tenantRepo.deleteTenant(ctx.tenantId);
};
