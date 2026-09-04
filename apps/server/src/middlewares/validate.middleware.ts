import { AppError } from "@/utils/app-error";
import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";

export const validate =
  (schema: ZodSchema): RequestHandler =>
  (req, _res, next) => {
    try {
      req.body = schema.parse(req.body);

      console.log({ LoginBody: req.body });
      next();
    } catch (error: any) {
      if (error.errors) {
        const message = error.errors
          .map((err: any) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        console.error("Validation error:", message);
        console.error("Request body:", req.body);
        throw new AppError(message, 400);
      }
      console.error("Validation failed:", error);
      throw new AppError("Validation failed", 400);
    }
  };
