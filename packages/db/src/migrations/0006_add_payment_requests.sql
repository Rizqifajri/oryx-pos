-- Migration: Add payment requests table and update transactions
-- Created: 2026-09-21

-- Create payment request status enum
CREATE TYPE "paymentRequestStatus" AS ENUM ('pending', 'success', 'failed', 'expired');

-- Create payment_requests table
CREATE TABLE IF NOT EXISTS "payment_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id"),
  "order_id" UUID NOT NULL REFERENCES "orders"("id"),
  "snap_token" TEXT NOT NULL,
  "snap_redirect_url" TEXT NOT NULL,
  "midtrans_order_id" TEXT NOT NULL UNIQUE,
  "amount" INTEGER NOT NULL,
  "status" "paymentRequestStatus" NOT NULL DEFAULT 'pending',
  "payment_type" TEXT,
  "fraud_status" TEXT,
  "expires_at" TIMESTAMP NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for payment_requests
CREATE INDEX "idx_payment_requests_order_id" ON "payment_requests"("order_id");
CREATE INDEX "idx_payment_requests_midtrans_order_id" ON "payment_requests"("midtrans_order_id");
CREATE INDEX "idx_payment_requests_status" ON "payment_requests"("status");
CREATE INDEX "idx_payment_requests_tenant_id" ON "payment_requests"("tenant_id");

-- Add payment_request_id and midtrans_transaction_id to transactions table
ALTER TABLE "transactions" 
ADD COLUMN IF NOT EXISTS "payment_request_id" UUID REFERENCES "payment_requests"("id"),
ADD COLUMN IF NOT EXISTS "midtrans_transaction_id" TEXT;

-- Create index for payment_request_id in transactions
CREATE INDEX "idx_transactions_payment_request_id" ON "transactions"("payment_request_id");
