-- Idempotent notification producers: (tenantId, dedupeKey) unique when key is set.
ALTER TABLE "notification" ADD COLUMN "dedupeKey" TEXT;

CREATE UNIQUE INDEX "notification_tenantId_dedupeKey_key"
  ON "notification"("tenantId", "dedupeKey");
