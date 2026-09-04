import { Pool } from "@neondatabase/serverless";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { permissions, rolePermissions, roles, users } from "./schema";

dotenv.config({ path: "../../apps/server/.env" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

const defaultPermissions = [
  // Tenant permissions (GLOBAL only)
  "tenant:list",
  "tenant:view",
  "tenant:create",
  "tenant:update",
  "tenant:delete",
  "tenant:manage",

  // Role permissions
  "role:list",
  "role:view",
  "role:create",
  "role:update",
  "role:delete",
  "role:manage",

  // Permission permissions (GLOBAL only)
  "permission:list",
  "permission:view",
  "permission:create",
  "permission:update",
  "permission:delete",
  "permission:manage",

  // User permissions
  "user:list",
  "user:view",
  "user:create",
  "user:update",
  "user:delete",
  "user:manage",

  // Menu permissions (TENANT)
  "menu:list",
  "menu:view",
  "menu:create",
  "menu:update",
  "menu:delete",
  "menu:manage",

  // Category permissions (TENANT)
  "category:list",
  "category:view",
  "category:create",
  "category:update",
  "category:delete",
  "category:manage",

  // Order permissions (TENANT)
  "order:list",
  "order:view",
  "order:create",
  "order:update",
  "order:delete",
  "order:manage",

  // Table permissions (TENANT)
  "table:list",
  "table:view",
  "table:create",
  "table:update",
  "table:delete",
  "table:manage",

  // Customer permissions (TENANT)
  "customer:list",
  "customer:view",
  "customer:create",
  "customer:update",
  "customer:delete",
  "customer:manage",

  // Transaction permissions (TENANT)
  "transaction:list",
  "transaction:view",
  "transaction:create",
  "transaction:update",
  "transaction:delete",
  "transaction:manage",
];

export const seedPermissions = async () => {
  console.log("Seeding permissions...");

  const existingPermissions = await db.select().from(permissions);
  const existingNames = new Set(existingPermissions.map((p) => p.name));

  const missingPermissions = defaultPermissions.filter(
    (name) => !existingNames.has(name),
  );

  if (missingPermissions.length === 0) {
    console.log(
      `All permissions already seeded (${existingPermissions.length} found). Skipping.`,
    );
    return;
  }

  const permissionRows = missingPermissions.map((name) => ({ name }));

  await db.insert(permissions).values(permissionRows);

  console.log(
    `Seeded ${permissionRows.length} new permissions successfully (${existingPermissions.length} already existed).`,
  );
};

export const seedSuperAdmin = async () => {
  console.log("Seeding super-admin...");

  // Check if super admin already exists
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@system.local"))
    .limit(1);

  if (existingAdmin.length > 0) {
    console.log("Super-admin already exists. Skipping.");
    return;
  }

  // No need to create a "system" tenant - global users have NULL tenantId

  const allPermissions = await db.select().from(permissions);

  // Create GLOBAL role with NULL tenantId
  const role = await db
    .insert(roles)
    .values({
      tenantId: null,
      name: "Super Admin",
      scope: "GLOBAL",
    })
    .returning();

  const rolePermissionRows = allPermissions.map((perm) => ({
    roleId: role[0]!.id,
    permissionId: perm.id,
  }));

  await db.insert(rolePermissions).values(rolePermissionRows);

  const hashedPassword = await bcrypt.hash("Admin@123", 12);

  // Create global user with NULL tenantId
  await db.insert(users).values({
    tenantId: null,
    roleId: role[0]!.id,
    name: "Super Admin",
    email: "admin@system.local",
    password: hashedPassword,
  });

  console.log("Super-admin seeded successfully.");
  console.log("Email: admin@system.local");
  console.log("Password: Admin@123");
  console.log("Note: Global users/roles now have NULL tenantId");
};

if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    await seedPermissions();
    await seedSuperAdmin();
  })()
    .then(() => {
      console.log("Seed completed.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seed failed:", error);
      process.exit(1);
    });
}
