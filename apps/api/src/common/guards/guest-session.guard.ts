import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import { AppError } from "../errors/app-error";
import { type GuestContext, verifyGuestToken } from "../utils/guest-token";

type RequestWithGuest = Request & { guest?: GuestContext };

/**
 * Authenticates a table guest from `X-Guest-Token` (or `?token=` for SSE).
 * When the route has a `:sessionId` param, the token must belong to it.
 * Use together with @Public() so the staff guards skip the route.
 */
@Injectable()
export class GuestSessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithGuest>();
    const header = request.headers["x-guest-token"];
    const token =
      (typeof header === "string" && header) ||
      (typeof request.query.token === "string" && request.query.token);

    if (!token) {
      throw new AppError("Sesi meja diperlukan", 401, {
        code: "GUEST_TOKEN_MISSING",
      });
    }

    const guest = await verifyGuestToken(token);
    const sessionId = request.params.sessionId;
    if (sessionId && sessionId !== guest.sessionId) {
      throw new AppError("Sesi meja tidak cocok", 403);
    }

    request.guest = guest;
    return true;
  }
}

export const CurrentGuest = createParamDecorator(
  (_data: unknown, context: ExecutionContext): GuestContext => {
    const request = context.switchToHttp().getRequest<RequestWithGuest>();
    return request.guest!;
  },
);
