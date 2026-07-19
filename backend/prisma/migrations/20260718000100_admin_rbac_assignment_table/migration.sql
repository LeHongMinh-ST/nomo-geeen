-- Migration: admin_rbac_assignment_table
-- Spec: specs/admin-rbac-user-management/ + admin-tenant-management R0-01
-- Additive schema for RBAC Phase A + tenant AuditAction values.
-- Column identifiers match init schema (camelCase quoted identifiers).

-- ============================================================================
-- F-02: Role.isAdmin companion column + CHECK + partial unique index
-- ============================================================================
ALTER TABLE "role" ADD COLUMN IF NOT EXISTS "isAdmin" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "role" DROP CONSTRAINT IF EXISTS "role_admin_null_tenant";
ALTER TABLE "role" ADD CONSTRAINT "role_admin_null_tenant"
  CHECK ("isAdmin" = false OR "tenantId" IS NULL);

CREATE UNIQUE INDEX IF NOT EXISTS "role_admin_code_unique"
  ON "role" ("code") WHERE "isAdmin" = true;

-- ============================================================================
-- F-03 + F-04: AuditLog.actorRoleCode + AuditAction enum conversion
-- ============================================================================
ALTER TABLE "audit_log" ADD COLUMN IF NOT EXISTS "actorRoleCode" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditAction') THEN
    CREATE TYPE "AuditAction" AS ENUM (
      'ADMIN_CREATE',
      'ADMIN_UPDATE',
      'ADMIN_DEACTIVATE',
      'ADMIN_REACTIVATE',
      'ADMIN_RESET_PASSWORD',
      'ADMIN_ROLE_ASSIGN',
      'ADMIN_ROLE_REVOKE',
      'ROLE_CREATE',
      'ROLE_UPDATE',
      'ROLE_DELETE',
      'ROLE_PERMISSION_GRANT',
      'ROLE_PERMISSION_REVOKE',
      'LOGIN',
      'LOGOUT',
      'REFRESH_REUSE_DETECTED',
      'TENANT_UPDATE',
      'TENANT_STATUS_CHANGE',
      'TENANT_EXPORT'
    );
  END IF;
END $$;

-- Convert action text -> enum when still text
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_log' AND column_name = 'action' AND udt_name = 'text'
  ) THEN
    ALTER TABLE "audit_log"
      ALTER COLUMN "action" DROP DEFAULT,
      ALTER COLUMN "action" TYPE "AuditAction" USING "action"::"AuditAction";
  END IF;
END $$;

-- If enum already exists without tenant values (edge), add them
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditAction') THEN
    BEGIN
      ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TENANT_UPDATE';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TENANT_STATUS_CHANGE';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TENANT_EXPORT';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- ============================================================================
-- F-01: AdminRoleAssignment join table (camelCase columns match Prisma fields)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "admin_role_assignment" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignedBy" TEXT,
  CONSTRAINT "admin_role_assignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "admin_role_assignment_adminId_roleId_key"
  ON "admin_role_assignment" ("adminId", "roleId");

CREATE INDEX IF NOT EXISTS "admin_role_assignment_roleId_idx"
  ON "admin_role_assignment" ("roleId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_role_assignment_adminId_fkey'
  ) THEN
    ALTER TABLE "admin_role_assignment"
      ADD CONSTRAINT "admin_role_assignment_adminId_fkey"
      FOREIGN KEY ("adminId") REFERENCES "platform_admin"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'admin_role_assignment_roleId_fkey'
  ) THEN
    ALTER TABLE "admin_role_assignment"
      ADD CONSTRAINT "admin_role_assignment_roleId_fkey"
      FOREIGN KEY ("roleId") REFERENCES "role"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
