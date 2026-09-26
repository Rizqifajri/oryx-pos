import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import type { Response } from "express";
import { AppError } from "../errors/app-error";

/**
 * Port of the Express `errorHandler`. Keeps the response envelope identical:
 * `{ success: false, message }` at the error's status, and a generic 500
 * otherwise so internal details are never leaked.
 *
 * HttpException is handled too because Nest raises its own (most visibly a 404
 * for an unmatched route, where Express used to return an HTML page); routing
 * those through the same envelope keeps every response on this API shaped alike.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof AppError) {
      console.error(exception);
      response.status(exception.statusCode).json({
        success: false,
        message: exception.message,
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      // Nest raises a NotFoundException for every unmatched route. Express
      // answered those from its own default handler and never logged them, so
      // log a single line here instead of a full stack trace.
      if (status >= 500) console.error(exception);
      else console.warn(`${status} ${exception.message}`);
      const body = exception.getResponse();
      const message =
        typeof body === "string"
          ? body
          : ((body as { message?: string | string[] }).message ??
            exception.message);

      response.status(status).json({
        success: false,
        message: Array.isArray(message) ? message.join(", ") : message,
      });
      return;
    }

    console.error(exception);
    response.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
}
