import { env } from "@dio-sys-be/env/server";
import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as relation from "./relations";
import * as schema from "./schema";

export function createDb() {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  return drizzle(pool, {
    schema: {
      ...schema,
      ...relation,
    },
  });
}

export const db = createDb();
