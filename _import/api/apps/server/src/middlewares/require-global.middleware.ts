import { assertGlobalScope } from "@/utils/assert-permission";
import type { NextFunction, Request, Response } from "express";

export const requireGlobal = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    if (!req.user) {
      throw new Error("Authentication required");
    }
    assertGlobalScope(req.user);
    next();
  } catch (error) {
    next(error);
  }
};
