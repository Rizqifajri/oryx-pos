/**
 * One-off, idempotent reconciliation of the permission model after the
 * `:read`/`:cancel` → `:list`/`:view`/`:manage` naming refactor.
 *
 *   1. Backfill legacy transactions with a subtotal (tax/service = 0).
 *   2. Delete orphaned permissions no route ever checks (`*:read`, `order:cancel`),
 *      removing their role_permissions links first (no FK cascade exists).
 *   3. Re-grant every TENANT-scope "Admin"/"Owner" role the full set of
 *      non-global permissions, so tenant owners aren't locked out of their
 *      own tenant. Custom/limited roles (e.g. "Staff Gudang") are left alone.
 *
 * Safe to run repeatedly.  Usage:  npx tsx src/reconcile-permissions.ts
 */
import { Pool } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config({ path: "../../apps/server/.env" });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");

// Permissions that only a GLOBAL (super-admin) role may hold. Mirrors
// apps/server/src/constants/permissions.ts GLOBAL_ONLY_PERMISSIONS.
const GLOBAL_ONLY = [
  "tenant:view",
  "tenant:create",
  "tenant:update",
  "tenant:delete",
  "tenant:manage",
  "permission:view",
  "permission:create",
  "permission:update",
  "permission:delete",
  "permission:manage",
];

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Backfill legacy transactions (subtotal defaulted to 0 on migration).
    const backfill = await client.query(
      `UPDATE transactions SET subtotal = total_amount
       WHERE subtotal = 0 AND total_amount > 0`,
    );
    console.log(`Backfilled ${backfill.rowCount} legacy transaction subtotals.`);

    // 2. Delete orphaned permissions (`*:read` and `order:cancel`).
    const stale = await client.query(
      `SELECT id, name FROM permissions
       WHERE name LIKE '%:read' OR name = 'order:cancel'`,
    );
    const staleIds = stale.rows.map((r: any) => r.id);
    if (staleIds.length > 0) {
      await client.query(
        `DELETE FROM role_permissions WHERE permission_id = ANY($1::uuid[])`,
        [staleIds],
      );
      await client.query(`DELETE FROM permissions WHERE id = ANY($1::uuid[])`, [
        staleIds,
      ]);
    }
    console.log(
      `Removed ${staleIds.length} orphaned permissions: ${stale.rows
        .map((r: any) => r.name)
        .join(", ")}`,
    );

    // 3. Re-sync TENANT Admin/Owner roles to all non-global permissions.
    const nonGlobal = await client.query(
      `SELECT id, name FROM permissions WHERE name <> ALL($1::text[])`,
      [GLOBAL_ONLY],
    );
    const nonGlobalIds = nonGlobal.rows.map((r: any) => r.id);

    const roles = await client.query(
      `SELECT r.id, r.name, t.name AS tenant_name
       FROM roles r JOIN tenants t ON t.id = r.tenant_id
       WHERE r.scope = 'TENANT' AND r.name IN ('Admin', 'Owner')
       ORDER BY t.name`,
    );

    let totalGranted = 0;
    for (const role of roles.rows) {
      const existing = await client.query(
        `SELECT permission_id FROM role_permissions WHERE role_id = $1`,
        [role.id],
      );
      const have = new Set(existing.rows.map((r: any) => r.permission_id));
      const missing = nonGlobalIds.filter((pid: string) => !have.has(pid));
      if (missing.length > 0) {
        const values = missing
          .map((_: string, i: number) => `($1, $${i + 2})`)
          .join(", ");
        await client.query(
          `INSERT INTO role_permissions (role_id, permission_id) VALUES ${values}`,
          [role.id, ...missing],
        );
      }
      totalGranted += missing.length;
      console.log(
        `  ${role.tenant_name} / ${role.name}: +${missing.length} (now ${nonGlobalIds.length})`,
      );
    }
    console.log(
      `Re-synced ${roles.rows.length} Admin/Owner roles (${totalGranted} grants added).`,
    );

    await client.query("COMMIT");
    console.log("Reconcile committed.");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Reconcile failed:", e);
  process.exit(1);
});
