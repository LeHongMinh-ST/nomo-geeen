-- Forward-compatible rollback: remove only additive columns/indexes.
-- PostgreSQL enum values cannot be safely removed while rows/code may use them;
-- retain PLAN_*/SUBSCRIPTION_* values so an app rollback remains readable.
DROP INDEX IF EXISTS "subscription_effective_lookup_idx";
DROP INDEX IF EXISTS "subscription_tenantId_status_updatedAt_idx";
ALTER TABLE "subscription"
  DROP COLUMN IF EXISTS "manualReference",
  DROP COLUMN IF EXISTS "reason";
