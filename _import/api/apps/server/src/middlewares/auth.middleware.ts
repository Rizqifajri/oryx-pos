import type { UserContext } from "@/types/user-context";
import { AppError } from "@/utils/app-error";
import { env } from "@dio-sys-be/env/server";
import type { NextFunction, Request, Response } from "express";
import { jwtVerify } from "jose";

declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

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

    req.user = userContext;
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
    } else {
      next(new AppError("Invalid or expired token", 401));
    }
  }
};
