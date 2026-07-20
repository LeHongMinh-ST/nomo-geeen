-- Tenant user identity and lifecycle contract.
-- Existing users receive username=email for backward-compatible login.

-- This enum is declared in schema.prisma but was missing from the original
-- migration, which caused fresh/partially migrated databases to fail before
-- adding the user identity columns.
CREATE TYPE "CreatedByType" AS ENUM ('PLATFORM_ADMIN', 'USER');

ALTER TYPE "PlatformAdminRole" ADD VALUE IF NOT EXISTS 'SALER';

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS "username" TEXT,
  ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "createdByType" "CreatedByType",
  ADD COLUMN IF NOT EXISTS "createdById" TEXT;

UPDATE "user"
SET "username" = LOWER("email")
WHERE "username" IS NULL;

ALTER TABLE "user"
  ALTER COLUMN "username" SET NOT NULL;

ALTER TABLE "user"
  ALTER COLUMN "email" DROP NOT NULL;

DROP INDEX IF EXISTS "user_tenantId_email_key";
DROP INDEX IF EXISTS "user_tenantId_phone_key";

CREATE UNIQUE INDEX IF NOT EXISTS "user_tenantId_username_key"
  ON "user" ("tenantId", "username");

CREATE UNIQUE INDEX IF NOT EXISTS "user_tenantId_email_active_key"
  ON "user" ("tenantId", "email")
  WHERE "email" IS NOT NULL AND "deletedAt" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "user_tenantId_phone_active_key"
  ON "user" ("tenantId", "phone")
  WHERE "phone" IS NOT NULL AND "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "user_tenantId_username_idx"
  ON "user" ("tenantId", "username");

CREATE INDEX IF NOT EXISTS "user_tenantId_phone_idx"
  ON "user" ("tenantId", "phone");

CREATE INDEX IF NOT EXISTS "user_tenantId_email_idx"
  ON "user" ("tenantId", "email");

CREATE INDEX IF NOT EXISTS "role_tenantId_isAdmin_idx"
  ON "role" ("tenantId", "isAdmin");

ALTER TABLE "role"
  ADD COLUMN IF NOT EXISTS "rank" INTEGER;

ALTER TABLE "role"
  DROP CONSTRAINT IF EXISTS "role_tenant_role_consistency";

ALTER TABLE "role"
  ADD CONSTRAINT "role_tenant_role_consistency"
  CHECK ("isAdmin" = false OR "tenantId" IS NULL);
