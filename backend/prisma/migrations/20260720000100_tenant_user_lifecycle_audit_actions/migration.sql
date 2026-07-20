-- tenant-user-management: additive USER lifecycle audit actions.
-- PostgreSQL enum additions are standalone and idempotent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AuditAction') THEN
    BEGIN
      ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_UPDATE';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_ROLE_CHANGE';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_DEACTIVATE';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_REACTIVATE';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'USER_RESET_PASSWORD';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
