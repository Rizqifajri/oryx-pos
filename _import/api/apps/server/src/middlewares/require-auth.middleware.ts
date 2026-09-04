import type { NextFunction, Request, Response } from "express";

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  try {
    if (!req.user) {
      throw new Error("Authentication required");
    }
    next();
  } catch (error) {
    next(error);
  }
};
