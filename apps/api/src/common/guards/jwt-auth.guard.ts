import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { env } from "@dio-sys-be/env/server";
import { jwtVerify } from "jose";
import { AuthRepository } from "../../modules/auth/auth.repository";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";
import { AppError } from "../errors/app-error";
import type { RequestWithUser } from "../types/request-with-user";

/**
 * Port of the Express `authenticate` middleware, registered globally. Verifies
 * the bearer token and puts a UserContext on the request. Routes marked
 * @Public() are skipped, mirroring the public routes that were mounted before
 * `router.use(authenticate)`.
 *
 * `requireAuth` from Express is folded in here: it only ever guarded against a
 * missing `req.user`, which cannot happen once this guard has run.
 *
 * The token is only trusted to say WHO the caller is. Scope and permissions are
 * read from the database on each request: the token's own snapshot is up to 24h
 * old, so trusting it let a revoked permission keep working for a day and made
 * a newly granted one 403 even though /auth/me already reported it.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authRepo: AuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();

    let userId: string;
    try {
      const authHeader = request.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new AppError("No token provided", 401);
      }

      const token = authHeader.substring(7);
      const secret = new TextEncoder().encode(env.JWT_SECRET);

      const { payload } = await jwtVerify(token, secret);
      userId = payload.sub as string;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Invalid or expired token", 401);
    }

    const auth = await this.authRepo.findUserAuthContext(userId);
    if (!auth) {
      throw new AppError("Invalid or expired token", 401);
    }

    request.user = {
      userId,
      tenantId: auth.tenantId,
      scope: auth.scope,
      roles: [],
      permissions: auth.permissions,
    };

    return true;
  }
}
