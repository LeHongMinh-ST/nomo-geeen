-- Reverting this migration restores the legacy uniqueness behavior.
CREATE UNIQUE INDEX IF NOT EXISTS "user_tenantId_email_active_key"
  ON "user" ("tenantId", "email")
  WHERE "email" IS NOT NULL AND "deletedAt" IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "user_tenantId_phone_active_key"
  ON "user" ("tenantId", "phone")
  WHERE "phone" IS NOT NULL AND "deletedAt" IS NULL;
