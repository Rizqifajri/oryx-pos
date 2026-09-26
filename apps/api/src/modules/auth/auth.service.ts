import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "@dio-sys-be/db";
import { env } from "@dio-sys-be/env/server";
import bcrypt from "bcrypt";
import { jwtVerify, SignJWT } from "jose";
import { GLOBAL_ONLY_PERMISSIONS } from "../../common/constants/permissions";
import { AppError } from "../../common/errors/app-error";
import { DRIZZLE } from "../../database/database.module";
import { AuthRepository } from "./auth.repository";
import type {
  LoginInput,
  RefreshTokenInput,
  RegisterInput,
} from "./auth.schema";

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

const parseExpiresIn = (expiresIn: string): Date => {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const value = parseInt(match[1]!);
  const units: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return new Date(Date.now() + value * (units[match[2]!] ?? 86_400_000));
};

@Injectable()
export class AuthService {
  constructor(
    @Inject(DRIZZLE) private readonly db: Db,
    private readonly authRepo: AuthRepository,
  ) {}

  async register(input: RegisterInput) {
    const emailExists = await this.authRepo.findUserByEmail(input.email);
    if (emailExists) {
      throw new AppError("Email already registered", 409);
    }

    let slug = generateSlug(input.tenantName);
    let slugExists = await this.authRepo.findTenantBySlug(slug);
    let retries = 0;

    while (slugExists && retries < 3) {
      slug = `${generateSlug(input.tenantName)}-${generateRandomSuffix(4)}`;
      slugExists = await this.authRepo.findTenantBySlug(slug);
      retries++;
    }

    if (slugExists) {
      throw new AppError(
        "Unable to create tenant, please try a different name",
        409,
      );
    }

    return await this.db.transaction(async (tx) => {
      const tenant = await this.authRepo.createTenant(
        { name: input.tenantName, slug },
        tx,
      );

      const role = await this.authRepo.createRole(
        { tenantId: tenant.id, name: "Admin", scope: "TENANT" },
        tx,
      );

      const allPermissions = await this.authRepo.findAllPermissions(tx);
      if (allPermissions.length === 0) {
        throw new AppError("System permissions not configured", 500);
      }

      const tenantPermissions = allPermissions.filter(
        (perm) => !GLOBAL_ONLY_PERMISSIONS.has(perm.name),
      );

      const rolePermissionRows = tenantPermissions.map(
        (perm: { id: string }) => ({
          roleId: role.id,
          permissionId: perm.id,
        }),
      );

      await this.authRepo.createRolePermissions(rolePermissionRows, tx);

      const hashedPassword = await bcrypt.hash(input.password, 12);

      const user = await this.authRepo.createUser(
        {
          tenantId: tenant.id,
          roleId: role.id,
          name: input.name,
          email: input.email,
          password: hashedPassword,
        },
        tx,
      );

      return {
        userId: user.id as string,
        tenantId: tenant.id as string,
      };
    });
  }

  async login(input: LoginInput) {
    const user = await this.authRepo.findUserByEmail(input.email);
    if (!user) {
      throw new AppError("Invalid credentials", 401);
    }

    const passwordMatch = await bcrypt.compare(input.password, user.password);
    if (!passwordMatch) {
      throw new AppError("Invalid credentials", 401);
    }

    const roleWithPermissions = await this.authRepo.findRoleWithPermissions(
      user.roleId,
    );
    if (!roleWithPermissions) {
      throw new AppError("Account configuration error", 500);
    }

    // For global users (tenantId = null), tenant lookup is not needed
    // For tenant users, validate tenant exists
    let tenant = null;
    if (user.tenantId) {
      tenant = await this.authRepo.findTenantById(user.tenantId);
      if (!tenant) {
        throw new AppError("Account configuration error", 500);
      }
    } else {
      // Global user - verify role scope matches
      if (roleWithPermissions.scope !== "GLOBAL") {
        throw new AppError(
          "Account configuration error: user tenantId mismatch with role scope",
          500,
        );
      }
    }

    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const accessToken = await new SignJWT({
      sub: user.id as string,
      tenantId: tenant?.id ?? null,
      scope: roleWithPermissions.scope,
      permissions: roleWithPermissions.permissions,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(env.JWT_EXPIRES_IN)
      .sign(secret);

    const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);
    const refreshToken = await new SignJWT({
      sub: user.id as string,
      tenantId: tenant?.id ?? null,
      type: "refresh",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(env.JWT_REFRESH_EXPIRES_IN)
      .sign(refreshSecret);

    const hashedRefreshToken = await bcrypt.hash(refreshToken, 12);
    await this.authRepo.updateUserRefreshToken(
      user.id,
      hashedRefreshToken,
      parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN),
    );

    return { accessToken, refreshToken };
  }

  async refreshAccessToken(input: RefreshTokenInput) {
    const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

    let payload;
    try {
      const { payload: verifiedPayload } = await jwtVerify(
        input.refreshToken,
        refreshSecret,
      );
      payload = verifiedPayload;
    } catch {
      throw new AppError("Invalid or expired refresh token", 401);
    }

    if (payload.type !== "refresh") {
      throw new AppError("Invalid token type", 401);
    }

    const userId = payload.sub as string;
    const tenantId = payload.tenantId as string | null;

    // Validate token against DB — catches revoked tokens
    const storedUser = await this.authRepo.findUserById(userId);
    if (!storedUser || !storedUser.refreshToken) {
      throw new AppError("Refresh token has been revoked", 401);
    }
    const refreshTokenMatches = await bcrypt.compare(
      input.refreshToken,
      storedUser.refreshToken,
    );
    if (!refreshTokenMatches) {
      throw new AppError("Refresh token has been revoked", 401);
    }

    if (
      storedUser.refreshTokenExpiresAt &&
      new Date(storedUser.refreshTokenExpiresAt) < new Date()
    ) {
      await this.authRepo.clearUserRefreshToken(userId);
      throw new AppError("Refresh token has expired", 401);
    }

    const roleWithPermissions = await this.authRepo.findRoleWithPermissions(
      storedUser.roleId,
    );
    if (!roleWithPermissions) {
      throw new AppError("Account configuration error", 500);
    }

    // For global users (tenantId = null), tenant lookup is not needed
    let tenant = null;
    if (tenantId) {
      tenant = await this.authRepo.findTenantById(tenantId);
      if (!tenant) {
        throw new AppError("Account configuration error", 500);
      }
    } else {
      // Global user - verify role scope matches
      if (roleWithPermissions.scope !== "GLOBAL") {
        throw new AppError(
          "Account configuration error: user tenantId mismatch with role scope",
          500,
        );
      }
    }

    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const accessToken = await new SignJWT({
      sub: storedUser.id,
      tenantId: tenant?.id ?? null,
      scope: roleWithPermissions.scope,
      permissions: roleWithPermissions.permissions,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(env.JWT_EXPIRES_IN)
      .sign(secret);

    const newRefreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);
    const newRefreshToken = await new SignJWT({
      sub: storedUser.id,
      tenantId: tenant?.id ?? null,
      type: "refresh",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime(env.JWT_REFRESH_EXPIRES_IN)
      .sign(newRefreshSecret);

    const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 12);
    await this.authRepo.updateUserRefreshToken(
      storedUser.id,
      hashedNewRefreshToken,
      parseExpiresIn(env.JWT_REFRESH_EXPIRES_IN),
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(userId: string) {
    await this.authRepo.clearUserRefreshToken(userId);
  }

  async getCurrentUserWithPermissions(userId: string) {
    const user = await this.authRepo.findUserById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const roleWithPermissions = await this.authRepo.findRoleWithPermissions(
      user.roleId,
    );
    if (!roleWithPermissions) {
      throw new AppError("User role not found", 500);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      scope: roleWithPermissions.scope,
      permissions: roleWithPermissions.permissions,
    };
  }
}
