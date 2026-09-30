import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { env } from "@dio-sys-be/env/server";
import { jwtVerify } from "jose";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { AppError } from "../errors/app-error";
import type { RequestWithUser } from "../types/request-with-user";
import type { UserContext } from "../types/user-context";

/**
 * Port of the Express `authenticate` middleware, registered globally. Verifies
 * the bearer token and puts a UserContext on the request. Routes marked
 * @Public() are skipped, mirroring the public routes that were mounted before
 * `router.use(authenticate)`.
 *
 * `requireAuth` from Express is folded in here: it only ever guarded against a
 * missing `req.user`, which cannot happen once this guard has run.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    try {
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AppError("No token provided", 401);
      }

      const token = authHeader.substring(7);
      const secret = new TextEncoder().encode(env.JWT_SECRET);

      const { payload } = await jwtVerify(token, secret);

      const userContext: UserContext = {
        userId: payload.sub as string,
        tenantId: (payload.tenantId as string) || null,
        scope: (payload.scope as "GLOBAL" | "TENANT") || "TENANT",
        roles: [],
        permissions: (payload.permissions as string[]) || [],
      };

      request.user = userContext;
      return true;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Invalid or expired token", 401);
    }
  }
}
