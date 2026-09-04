import type { UserContext } from "@/types/user-context";
import { AppError } from "@/utils/app-error";
import { assertTenantMatch } from "@/utils/assert-permission";
import bcrypt from "bcrypt";
import * as roleRepo from "../role/role.repository";
import * as tenantRepo from "../tenant/tenant.repository";
import * as userRepo from "./user.repository";
import type { CreateUserInput, UpdateUserInput } from "./user.schema";

export const listUsers = async (ctx: UserContext) => {
  // Permission check now handled by route middleware
  if (ctx.scope === "TENANT") {
    if (!ctx.tenantId) {
      throw new AppError("Tenant context required", 400);
    }
    return await userRepo.findUsersByTenantId(ctx.tenantId);
  }

  return await userRepo.findAllUsers();
};

export const getUsersByTenant = async (ctx: UserContext, tenantId: string) => {
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

  return await userRepo.findUsersByTenantId(tenantId);
};

export const getUser = async (ctx: UserContext, id: string) => {
  // Permission check now handled by route middleware
  const user = await userRepo.findUserById(id);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (ctx.scope === "TENANT") {
    assertTenantMatch(ctx, user.tenantId);
  }

  return user;
};

export const createUser = async (ctx: UserContext, input: CreateUserInput) => {
  // Permission check now handled by route middleware

  // First, fetch the role to determine scope
  const role = await roleRepo.findRoleById(input.roleId);
  if (!role) {
    throw new AppError("Role not found", 404);
  }

  // Handle user creation based on role scope
  if (role.scope === "GLOBAL") {
    // Only GLOBAL users can assign GLOBAL roles
    if (ctx.scope !== "GLOBAL") {
      throw new AppError(
        "Only GLOBAL admins can create users with GLOBAL roles",
        403,
      );
    }
    // Users with GLOBAL roles must have null tenantId
    input.tenantId = null;
  } else {
    // Role is TENANT-scoped
    if (ctx.scope === "TENANT") {
      if (!ctx.tenantId) {
        throw new AppError("Tenant context required", 400);
      }
      // For TENANT users, use their tenantId if not provided
      if (!input.tenantId) {
        input.tenantId = ctx.tenantId;
      }
      if (input.tenantId !== ctx.tenantId) {
        throw new AppError("You can only create users in your own tenant", 403);
      }
      // Verify role belongs to their tenant
      if (role.tenantId !== ctx.tenantId) {
        throw new AppError("Role does not belong to your tenant", 403);
      }
    }

    // TENANT-scoped users must have tenantId
    if (!input.tenantId) {
      throw new AppError("Users with TENANT roles must have a tenantId", 400);
    }

    // Verify user's tenantId matches role's tenantId
    if (input.tenantId !== role.tenantId) {
      throw new AppError("User tenantId must match role tenantId", 400);
    }

    // Validate tenant exists
    const tenant = await tenantRepo.findTenantById(input.tenantId);
    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }
  }

  const existingUser = await userRepo.findUserByEmail(input.email);
  if (existingUser) {
    throw new AppError("Email already in use", 409);
  }

  const hashedPassword = await bcrypt.hash(input.password, 12);

  return await userRepo.createUser({
    tenantId: input.tenantId as string,
    roleId: input.roleId,
    name: input.name,
    email: input.email,
    password: hashedPassword,
  });
};

export const updateUser = async (
  ctx: UserContext,
  id: string,
  input: UpdateUserInput,
) => {
  // Permission check now handled by route middleware
  const user = await userRepo.findUserById(id);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (ctx.scope === "TENANT") {
    assertTenantMatch(ctx, user.tenantId);
  }

  if (input.roleId) {
    const role = await roleRepo.findRoleById(input.roleId);
    if (!role) {
      throw new AppError("Role not found", 404);
    }
    if (ctx.scope === "TENANT" && role.tenantId !== ctx.tenantId) {
      throw new AppError("Role does not belong to your tenant", 403);
    }
  }

  if (input.email) {
    const existing = await userRepo.findUserByEmail(input.email);
    if (existing && existing.id !== id) {
      throw new AppError("Email already in use", 409);
    }
  }

  const updateData: {
    name?: string;
    email?: string;
    password?: string;
    roleId?: string;
  } = {
    name: input.name,
    email: input.email,
    roleId: input.roleId,
  };

  if (input.password) {
    updateData.password = await bcrypt.hash(input.password, 12);
  }

  return await userRepo.updateUser(id, updateData);
};

export const deleteUser = async (ctx: UserContext, id: string) => {
  // Permission check now handled by route middleware
  const user = await userRepo.findUserById(id);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (ctx.scope === "TENANT") {
    assertTenantMatch(ctx, user.tenantId);
  }

  return await userRepo.deleteUser(id);
};
