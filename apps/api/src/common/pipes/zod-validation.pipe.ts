import { Injectable, type PipeTransform } from "@nestjs/common";
import type { ZodType } from "zod";
import { AppError } from "../errors/app-error";

/**
 * Port of the Express `validate(schema)` middleware. The error string format is
 * reproduced exactly — "path: message" joined with ", " at status 400 — because
 * the frontend surfaces `message` verbatim.
 *
 * The *parsed* value is returned, so Zod defaults are applied the same way they
 * were when the middleware reassigned `req.body` (menu.isAvailable, role.scope,
 * role.permissionIds, table.status).
 */
@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    try {
      return this.schema.parse(value);
    } catch (error: any) {
      if (error.issues) {
        const message = error.issues
          .map((err: any) => `${err.path.join(".")}: ${err.message}`)
          .join(", ");
        throw new AppError(message, 400);
      }
      throw new AppError("Validation failed", 400);
    }
  }
}
