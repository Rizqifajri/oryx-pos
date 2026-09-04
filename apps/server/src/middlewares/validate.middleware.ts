import { AppError } from "@/utils/app-error";
import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";

export const validate =
  (schema: ZodSchema): RequestHandler =>
  (req, _res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error: any) {
      if (error.issues) {
        const message = error.issues
          .map((err: any) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        throw new AppError(message, 400);
      }
      throw new AppError("Validation failed", 400);
    }
  };
