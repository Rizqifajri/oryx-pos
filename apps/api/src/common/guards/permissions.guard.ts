import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { PERMISSIONS_KEY } from "../decorators/require-permissions.decorator";
import { AppError } from "../errors/app-error";
import type { RequestWithUser } from "../types/request-with-user";

/**
 * Port of the Express `requirePermission(...)` middleware, registered globally
 * and driven by @RequirePermissions(...).
 *
 * - routes with no @RequirePermissions are not permission-gated
 * - GLOBAL users bypass all permission checks
 * - TENANT users must hold at least ONE of the listed permissions
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const permissions = this.reflector.getAllAndOverride<string[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permission metadata on this route: nothing to enforce.
    if (!permissions || permissions.length === 0) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user) {
      throw new AppError("Authentication required", 401);
    }

    // GLOBAL users bypass all permission checks
    if (request.user.scope === "GLOBAL") return true;

    const hasPermission = permissions.some((permission) =>
      request.user!.permissions.includes(permission),
    );

    if (!hasPermission) {
      const permissionList = permissions.join(" or ");
      throw new AppError(`Missing required permission: ${permissionList}`, 403);
    }

    return true;
  }
}
