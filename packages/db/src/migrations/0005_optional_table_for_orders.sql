-- Migration: Make tableId optional for orders
-- This allows orders without assigned tables (takeout, delivery, walk-in orders)

BEGIN;

-- Make table_id nullable for orders
ALTER TABLE "orders" 
  ALTER COLUMN "table_id" DROP NOT NULL;

COMMIT;