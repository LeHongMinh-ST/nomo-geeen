-- Migration down: admin_rbac_assignment_table
-- Reverses additive schema additions from migration.sql.
-- Run with: psql $DATABASE_URL -f migration_down.sql
-- Drops audit_log.action enum cast (restores to text), drops new objects.

-- ============================================================================
-- Reverse: AdminRoleAssignment
-- ============================================================================
DROP TABLE IF EXISTS "admin_role_assignment";

-- ============================================================================
-- Reverse: AuditLog.actorRoleCode + AuditAction enum cast
-- ============================================================================
-- Convert enum back to text so legacy string values are preserved.
ALTER TABLE "audit_log"
  ALTER COLUMN "action" DROP DEFAULT,
  ALTER COLUMN "action" TYPE TEXT USING "action"::TEXT;

DROP TYPE IF EXISTS "AuditAction";

ALTER TABLE "audit_log" DROP COLUMN IF EXISTS "actorRoleCode";

-- ============================================================================
-- Reverse: Role.isAdmin
-- ============================================================================
DROP INDEX IF EXISTS "role_admin_code_unique";

ALTER TABLE "role" DROP CONSTRAINT IF EXISTS "role_admin_null_tenant";

ALTER TABLE "role" DROP COLUMN IF EXISTS "isAdmin";