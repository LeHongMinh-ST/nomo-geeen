-- admin-tenant-provisioning (R0-01): additive AuditAction values for tenant + owner provisioning.
-- Postgres `ALTER TYPE ... ADD VALUE` is non-transactional, so this is a standalone migration
-- deployed before any app code emits TENANT_CREATE / USER_CREATE. Idempotent + safe on re-apply.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditAction') THEN
    BEGIN
      ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TENANT_CREATE';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_CREATE';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
