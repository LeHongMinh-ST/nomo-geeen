-- Per-user notification read state.
-- Tenant-wide rows (userId null) must not share a single readAt across users.

CREATE TABLE "notification_read" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notification_read_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "notification_read_notificationId_userId_key"
  ON "notification_read"("notificationId", "userId");

CREATE INDEX "notification_read_tenantId_userId_readAt_idx"
  ON "notification_read"("tenantId", "userId", "readAt");

-- Backfill only user-targeted notifications that already had a shared readAt.
-- Tenant-wide shared reads are intentionally not projected to every user.
INSERT INTO "notification_read" ("id", "tenantId", "notificationId", "userId", "readAt")
SELECT
  md5(n."id" || ':' || n."userId"),
  n."tenantId",
  n."id",
  n."userId",
  n."readAt"
FROM "notification" n
WHERE n."userId" IS NOT NULL
  AND n."readAt" IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE "notification_read"
  ADD CONSTRAINT "notification_read_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES "notification"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notification_read"
  ADD CONSTRAINT "notification_read_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "user"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

DROP INDEX IF EXISTS "notification_tenantId_userId_readAt_idx";

ALTER TABLE "notification" DROP COLUMN IF EXISTS "readAt";

CREATE INDEX "notification_tenantId_userId_createdAt_idx"
  ON "notification"("tenantId", "userId", "createdAt");
