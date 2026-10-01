import { env } from "@dio-sys-be/env/server";
import { type PoolClient, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as relation from "./relations";
import * as schema from "./schema";

export function createDb() {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  // Neon closes idle websocket connections. Without a listener that error is
  // "unhandled" and takes the whole process down; the pool discards the dead
  // client and opens a fresh one on the next query.
  pool.on("error", (error: Error) => {
    console.warn(`[db] idle connection closed: ${error.message}`);
  });
  // Same for a client that is checked out (mid-request): the query in flight
  // fails with its own error, but the process must not crash.
  pool.on("connect", (client: PoolClient) => {
    client.on("error", (error: Error) => {
      console.warn(`[db] connection dropped: ${error.message}`);
    });
  });
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
