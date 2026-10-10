export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  /** Machine-readable reason the client can branch on, e.g. "BILL_LOCKED". */
  code?: string;
  /** Structured context for the client, e.g. which order lines were rejected. */
  details?: unknown;

  constructor(
    message: string,
    statusCode = 500,
    extra?: { code?: string; details?: unknown },
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = extra?.code;
    this.details = extra?.details;

    Error.captureStackTrace(this, this.constructor);
  }
}
