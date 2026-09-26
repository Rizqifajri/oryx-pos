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

export type Db = typeof db;

/**
 * Either the pooled connection or an open transaction handle. Repository
 * methods take this so the same query can run standalone or inside
 * `db.transaction(...)`.
 */
export type DbOrTx = Db | Parameters<Parameters<typeof db.transaction>[0]>[0];
