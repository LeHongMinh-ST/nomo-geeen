-- CreateEnum
CREATE TYPE "LivestockHealthState" AS ENUM ('HEALTHY', 'QUARANTINED', 'SICK', 'DEAD', 'REJECTED');

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'LIVESTOCK_STATE_CHANGE';

-- AlterTable ProductBatch: optimistic version + health metadata (default HEALTHY for existing rows)
ALTER TABLE "product_batch" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "product_batch" ADD COLUMN IF NOT EXISTS "healthState" "LivestockHealthState" NOT NULL DEFAULT 'HEALTHY';
ALTER TABLE "product_batch" ADD COLUMN IF NOT EXISTS "healthReason" TEXT;
ALTER TABLE "product_batch" ADD COLUMN IF NOT EXISTS "healthNote" TEXT;
ALTER TABLE "product_batch" ADD COLUMN IF NOT EXISTS "healthChangedAt" TIMESTAMP(3);
ALTER TABLE "product_batch" ADD COLUMN IF NOT EXISTS "healthChangedBy" TEXT;

CREATE INDEX IF NOT EXISTS "product_batch_tenantId_healthState_idx" ON "product_batch"("tenantId", "healthState");
