import { env } from "@dio-sys-be/env/server";
import { setBucketCors } from "../common/lib/r2";

/**
 * Applies the R2 bucket CORS policy needed for browser-side presigned uploads.
 *
 *   npm run r2:cors --workspace apps/api
 *
 * Allowed origins default to CORS_ORIGIN; pass extra origins (e.g. the
 * production web URL) as CLI args:
 *
 *   npm run r2:cors --workspace apps/api -- https://app.example.com
 */
const run = async () => {
  const origins = [env.CORS_ORIGIN, ...process.argv.slice(2)].filter(Boolean);

  console.log("Applying R2 CORS policy for origins:", origins);
  await setBucketCors(origins);
  console.log("Done. Browsers may now PUT directly to presigned URLs.");
};

run().catch((err) => {
  console.error("Failed to apply R2 CORS policy:", err);
  process.exit(1);
});
