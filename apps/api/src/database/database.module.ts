import { Global, Module } from "@nestjs/common";
import { db } from "@dio-sys-be/db";

/** Injection token for the Drizzle connection. */
export const DRIZZLE = "DRIZZLE";

/**
 * Provides the Drizzle connection application-wide. `db` is the same pooled
 * singleton the Express app used, created once at import time in
 * @dio-sys-be/db, so connection behaviour is unchanged.
 */
@Global()
@Module({
  providers: [{ provide: DRIZZLE, useValue: db }],
  exports: [DRIZZLE],
})
export class DatabaseModule {}
