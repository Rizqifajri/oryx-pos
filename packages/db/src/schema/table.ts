import { sql } from "drizzle-orm";
import {
  date,
  integer,
  pgEnum,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenant";

export const tableStatus = pgEnum("tableStatus", ["AVAILABLE", "OCCUPIED"]);

export const tables = pgTable("tables", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  name: text("name").notNull(),
  capacity: integer("capacity").notNull(),
  status: tableStatus("status").default("AVAILABLE").notNull(),
  // Long random token printed in the table's QR code (the public URL never
  // exposes the table id). Rotating it invalidates previously printed codes.
  // Two UUIDv4s give ~244 random bits; the SQL default backfills old rows.
  qrToken: text("qr_token")
    .notNull()
    .unique()
    .default(sql`replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')`),
  createdAt: date("created_at").notNull().defaultNow(),
});
