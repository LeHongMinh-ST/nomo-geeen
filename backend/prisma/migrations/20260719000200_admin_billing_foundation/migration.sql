-- Additive manual billing foundation. Existing rows remain readable.

ALTER TABLE "subscription"
  ADD COLUMN IF NOT EXISTS "manualReference" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "reason" VARCHAR(500);

-- Deterministic pre-migration duplicate report. This intentionally reports
-- rows and does not delete or constrain historical subscriptions. Operators
-- resolve duplicates by retaining the latest row (updatedAt DESC, id DESC)
-- for effective reads before any future uniqueness decision.
DO $$
DECLARE
  duplicate RECORD;
BEGIN
  FOR duplicate IN
    SELECT "tenantId", COUNT(*) AS "rowCount",
           ARRAY_AGG("id" ORDER BY "updatedAt" DESC, "id" DESC) AS "subscriptionIds"
    FROM "subscription"
    WHERE "status" IN ('ACTIVE', 'TRIALING')
    GROUP BY "tenantId"
    HAVING COUNT(*) > 1
    ORDER BY "tenantId"
  LOOP
    RAISE NOTICE 'duplicate active/trial subscriptions tenantId=% rowCount=% subscriptionIds=%; operator resolution: retain latest updatedAt DESC, id DESC and preserve history',
      duplicate."tenantId", duplicate."rowCount", duplicate."subscriptionIds";
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS "subscription_tenantId_status_updatedAt_idx"
  ON "subscription" ("tenantId", "status", "updatedAt");

CREATE INDEX IF NOT EXISTS "subscription_effective_lookup_idx"
  ON "subscription" ("tenantId", "status", "startDate", "endDate", "trialEndsAt");

DO $$
BEGIN
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PLAN_CREATE';
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PLAN_UPDATE';
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PLAN_ACTIVATE';
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PLAN_DEACTIVATE';
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_ASSIGN';
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_CHANGE';
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_RENEW';
  ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SUBSCRIPTION_CANCEL';
END $$;
