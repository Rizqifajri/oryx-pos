import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { UserContext } from "../types/user-context";

/**
 * The UserContext that JwtAuthGuard put on the request. Replaces `req.user!`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserContext => {
    return ctx.switchToHttp().getRequest().user as UserContext;
  },
);
