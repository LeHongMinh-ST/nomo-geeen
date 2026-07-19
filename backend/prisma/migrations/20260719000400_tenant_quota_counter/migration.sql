-- Additive counter foundation for atomic tenant quota reservations.
CREATE TABLE "tenant_quota_counter" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "dimension" TEXT NOT NULL,
  "periodKey" TEXT NOT NULL,
  "used" BIGINT NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_quota_counter_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_quota_counter_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "tenant_quota_counter_tenantId_dimension_periodKey_key"
  ON "tenant_quota_counter"("tenantId", "dimension", "periodKey");
CREATE INDEX "tenant_quota_counter_tenantId_dimension_idx"
  ON "tenant_quota_counter"("tenantId", "dimension");

-- Deterministic initial snapshot. Soft-deleted products do not consume quota.
INSERT INTO "tenant_quota_counter" ("id", "tenantId", "dimension", "periodKey", "used", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text), "tenantId", 'maxProducts', 'lifetime', COUNT(*)::bigint, CURRENT_TIMESTAMP
FROM "product"
WHERE "deletedAt" IS NULL
GROUP BY "tenantId";
