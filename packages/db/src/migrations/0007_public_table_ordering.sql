-- Migration: Public table ordering (QR sessions, table bills, service requests)
-- Created: 2026-09-30
-- Additive only: new tables/columns with defaults, plus payment_requests.order_id
-- becoming nullable so a payment can cover a whole table bill instead.

BEGIN;

-- ── Tenants: guest-facing profile ────────────────────────────────────────────
ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "tagline" TEXT,
  ADD COLUMN IF NOT EXISTS "is_open" BOOLEAN NOT NULL DEFAULT TRUE;

-- ── Tables: unguessable QR token (backfilled for existing rows) ──────────────
ALTER TABLE "tables"
  ADD COLUMN IF NOT EXISTS "qr_token" TEXT NOT NULL
    DEFAULT replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
CREATE UNIQUE INDEX IF NOT EXISTS "tables_qr_token_unique" ON "tables"("qr_token");

-- ── Menus: merchandising flags ───────────────────────────────────────────────
ALTER TABLE "menus"
  ADD COLUMN IF NOT EXISTS "is_popular" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "badge" TEXT;

-- ── Table sessions ───────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "tableSessionStatus" AS ENUM ('open', 'billing', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "table_sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id"),
  "table_id" UUID NOT NULL REFERENCES "tables"("id"),
  "status" "tableSessionStatus" NOT NULL DEFAULT 'open',
  "opened_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "closed_at" TIMESTAMP,
  "closed_reason" TEXT
);
-- One live session per table.
CREATE UNIQUE INDEX IF NOT EXISTS "table_sessions_one_active_per_table_idx"
  ON "table_sessions"("table_id") WHERE "status" IN ('open', 'billing');

-- ── Orders: session rounds ───────────────────────────────────────────────────
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "session_id" UUID REFERENCES "table_sessions"("id"),
  ADD COLUMN IF NOT EXISTS "note" TEXT,
  ADD COLUMN IF NOT EXISTS "idempotency_key" TEXT,
  ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMP NOT NULL DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS "orders_session_idempotency_key_idx"
  ON "orders"("session_id", "idempotency_key");

ALTER TABLE "order_items"
  ADD COLUMN IF NOT EXISTS "note" TEXT;

-- ── Bills ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "billStatus" AS ENUM ('open', 'locked', 'paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "bills" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id"),
  "session_id" UUID NOT NULL UNIQUE REFERENCES "table_sessions"("id"),
  "status" "billStatus" NOT NULL DEFAULT 'open',
  "subtotal" INTEGER NOT NULL DEFAULT 0,
  "tax_amount" INTEGER NOT NULL DEFAULT 0,
  "service_amount" INTEGER NOT NULL DEFAULT 0,
  "total_amount" INTEGER NOT NULL DEFAULT 0,
  "payment_method" TEXT,
  "locked_at" TIMESTAMP,
  "paid_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── Payment requests may pay a bill instead of a single order ────────────────
ALTER TABLE "payment_requests"
  ALTER COLUMN "order_id" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "bill_id" UUID REFERENCES "bills"("id");
CREATE INDEX IF NOT EXISTS "idx_payment_requests_bill_id" ON "payment_requests"("bill_id");

-- ── Service requests ─────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE "serviceRequestType" AS ENUM ('call_waiter', 'water', 'cutlery', 'bill');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE "serviceRequestStatus" AS ENUM ('pending', 'handled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "service_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id"),
  "session_id" UUID NOT NULL REFERENCES "table_sessions"("id"),
  "table_id" UUID NOT NULL REFERENCES "tables"("id"),
  "type" "serviceRequestType" NOT NULL,
  "status" "serviceRequestStatus" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "handled_at" TIMESTAMP,
  "handled_by" UUID REFERENCES "users"("id")
);
CREATE INDEX IF NOT EXISTS "idx_service_requests_tenant_status"
  ON "service_requests"("tenant_id", "status");

COMMIT;
