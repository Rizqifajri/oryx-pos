-- Migration: Split bill + table transfer/merge
-- Created: 2026-10-01
-- Additive only.

-- New enum values cannot be used in the transaction that adds them, so this
-- runs before BEGIN.
ALTER TYPE "serviceRequestType" ADD VALUE IF NOT EXISTS 'move_table';

BEGIN;

ALTER TABLE "bills" ADD COLUMN IF NOT EXISTS "split_mode" TEXT;

DO $$ BEGIN
  CREATE TYPE "billShareStatus" AS ENUM ('pending', 'paid', 'void');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "bill_shares" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id"),
  "bill_id" UUID NOT NULL REFERENCES "bills"("id"),
  "label" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" "billShareStatus" NOT NULL DEFAULT 'pending',
  "items" JSONB,
  "payment_method" TEXT,
  "paid_at" TIMESTAMP,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_bill_shares_bill_id" ON "bill_shares"("bill_id");

ALTER TABLE "payment_requests"
  ADD COLUMN IF NOT EXISTS "share_id" UUID REFERENCES "bill_shares"("id");

ALTER TABLE "table_sessions"
  ADD COLUMN IF NOT EXISTS "merged_into_session_id" UUID REFERENCES "table_sessions"("id");

ALTER TABLE "service_requests" ADD COLUMN IF NOT EXISTS "note" TEXT;

COMMIT;
