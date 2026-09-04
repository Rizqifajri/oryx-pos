-- Migration: Make tenantId nullable for global users and roles
-- This allows global-scoped users/roles to have NULL tenantId instead of using a "system" tenant

BEGIN;

-- Step 1: Make columns nullable
ALTER TABLE "roles" 
  ALTER COLUMN "tenant_id" DROP NOT NULL;

ALTER TABLE "users" 
  ALTER COLUMN "tenant_id" DROP NOT NULL;

-- Step 2: Update existing global roles to have NULL tenantId
-- Find roles with scope='GLOBAL' and set their tenantId to NULL
UPDATE "roles" 
SET "tenant_id" = NULL 
WHERE "scope" = 'GLOBAL';

-- Step 3: Update existing users with global roles to have NULL tenantId
-- Find users whose role has scope='GLOBAL' and set their tenantId to NULL
UPDATE "users" 
SET "tenant_id" = NULL 
WHERE "role_id" IN (
  SELECT "id" FROM "roles" WHERE "scope" = 'GLOBAL'
);

-- Step 4: Add check constraints to enforce business rules
-- Global roles MUST have NULL tenantId, Tenant roles MUST have non-NULL tenantId
ALTER TABLE "roles"
ADD CONSTRAINT "role_tenant_scope_check"
CHECK (
  ("scope" = 'GLOBAL' AND "tenant_id" IS NULL) OR
  ("scope" = 'TENANT' AND "tenant_id" IS NOT NULL)
);

-- Note: We cannot add a similar constraint to users table because it would require
-- a join with roles table in the constraint. Instead, we'll enforce this in the application layer.

COMMIT;