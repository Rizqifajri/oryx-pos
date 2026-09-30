import { createHash } from "crypto";
import { env } from "@dio-sys-be/env/server";
import { jwtVerify, SignJWT } from "jose";
import { AppError } from "../errors/app-error";

/**
 * Guest tokens identify a device seated in a table session. They are signed
 * with a key derived from JWT_SECRET (not JWT_SECRET itself) so a guest token
 * can never pass the staff JwtAuthGuard.
 *
 * The token is sent as the `X-Guest-Token` header (or `?token=` for SSE, where
 * EventSource cannot set headers) instead of a cookie, because the web app and
 * API live on different origins.
 */
const GUEST_AUDIENCE = "table-guest";
const GUEST_TTL = "12h";

const guestKey = createHash("sha256")
  .update(`${env.JWT_SECRET}:table-guest`)
  .digest();

export interface GuestContext {
  sessionId: string;
  tableId: string;
  tenantId: string;
}

export async function signGuestToken(ctx: GuestContext): Promise<string> {
  return await new SignJWT({ tid: ctx.tableId, ten: ctx.tenantId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(ctx.sessionId)
    .setAudience(GUEST_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(GUEST_TTL)
    .sign(guestKey);
}

export async function verifyGuestToken(token: string): Promise<GuestContext> {
  try {
    const { payload } = await jwtVerify(token, guestKey, {
      audience: GUEST_AUDIENCE,
    });
    return {
      sessionId: payload.sub as string,
      tableId: payload.tid as string,
      tenantId: payload.ten as string,
    };
  } catch {
    throw new AppError("Sesi meja tidak valid. Pindai ulang QR meja.", 401, {
      code: "GUEST_TOKEN_INVALID",
    });
  }
}
