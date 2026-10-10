import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { AppError } from "../errors/app-error";
import type { RequestWithUser } from "../types/request-with-user";
import { assertGlobalScope } from "../utils/assert-permission";

/**
 * Port of the Express `requireGlobal` middleware. Applied per route with
 * @UseGuards(GlobalScopeGuard); Nest runs the global guards (JwtAuthGuard, then
 * PermissionsGuard) first, so the order matches `authenticate -> requireGlobal`.
 */
@Injectable()
export class GlobalScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user) {
      throw new AppError("Authentication required", 401);
    }

    assertGlobalScope(request.user);
    return true;
  }
}
