/**
 * Fixes invalid image URLs in the database.
 * Removes relative paths like /uploads/menus/... that point to non-existent files.
 * Only keeps full R2 URLs that start with https://
 */

import { Pool } from "@neondatabase/serverless";
import dotenv from "dotenv";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { menus } from "./schema";

dotenv.config({ path: "../../apps/api/.env" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function fixInvalidImageUrls() {
  console.log("Checking for invalid image URLs...");

  // Find menus with relative paths (invalid)
  const invalidMenus = await db
    .select({ id: menus.id, name: menus.name, imageUrl: menus.imageUrl })
    .from(menus)
    .where(sql`${menus.imageUrl} IS NOT NULL AND ${menus.imageUrl} NOT LIKE 'https://%'`);

  console.log(`Found ${invalidMenus.length} menus with invalid image URLs:`);
  invalidMenus.forEach((menu) => {
    console.log(`  - ${menu.name}: ${menu.imageUrl}`);
  });

  if (invalidMenus.length > 0) {
    console.log("\nClearing invalid image URLs...");
    await db
      .update(menus)
      .set({ imageUrl: null })
      .where(sql`${menus.imageUrl} IS NOT NULL AND ${menus.imageUrl} NOT LIKE 'https://%'`);

    console.log("✓ Invalid image URLs cleared. These menu items will need images re-uploaded.");
  } else {
    console.log("✓ No invalid image URLs found.");
  }
  
  await pool.end();
}

fixInvalidImageUrls()
  .then(() => {
    console.log("\nDone!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
