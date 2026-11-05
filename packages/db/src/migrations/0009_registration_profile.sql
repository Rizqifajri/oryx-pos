-- Migration: Business profile + phone captured at registration
-- Created: 2026-11-02
-- Additive only; all columns nullable so existing tenants/users stay valid.

BEGIN;

ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "business_type" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "country" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "province" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "plan" TEXT;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;

COMMIT;
