import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { env } from "@dio-sys-be/env/server";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";

/**
 * Builds the application without starting a listener, so the long-running
 * entrypoint (main.ts) and the serverless handler (api/index.ts) share exactly
 * one configuration.
 */
export async function createApp() {
  const app = await NestFactory.create(AppModule, { bodyParser: true });

  app.enableCors({
    origin: env.CORS_ORIGIN,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  });

  // Every route lives under /api/v1 except the root health check, matching the
  // Express mounts. The frontend's NEXT_PUBLIC_API_URL already includes /api/v1.
  app.setGlobalPrefix("api/v1", { exclude: ["/"] });

  app.useGlobalFilters(new AllExceptionsFilter());

  return app;
}
