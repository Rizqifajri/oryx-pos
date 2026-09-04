import { AppError } from "@/utils/app-error";
import type { NextFunction, Request, Response } from "express";

/**
 * Middleware to require specific permission(s) for a route.
 * 
 * - GLOBAL users bypass all permission checks (have all permissions)
 * - TENANT users must have at least ONE of the specified permissions
 * - Supports single or multiple permissions (OR logic)
 * 
 * @param permissions - One or more permission names required for this route
 * @returns Express middleware function
 * 
 * @example
 * // Single permission
 * router.get("/", requirePermission("menu:read"), asyncHandler(...));
 * 
 * @example
 * // Multiple permissions (user needs at least one)
 * router.get("/", requirePermission("user:view", "user:list"), asyncHandler(...));
 */
export const requirePermission = (...permissions: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        throw new AppError("Authentication required", 401);
      }

      // GLOBAL users bypass all permission checks
      if (req.user.scope === "GLOBAL") {
        return next();
      }

      // TENANT users must have at least one of the required permissions
      const hasPermission = permissions.some((permission) =>
        req.user!.permissions.includes(permission),
      );

      if (!hasPermission) {
        const permissionList = permissions.join(" or ");
        throw new AppError(
          `Missing required permission: ${permissionList}`,
          403,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
