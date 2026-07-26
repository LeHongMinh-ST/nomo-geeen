-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AreaUnit') THEN
    CREATE TYPE "AreaUnit" AS ENUM ('M2', 'HA', 'SAO_BAC', 'SAO_TRUNG', 'CONG_NAM');
  END IF;
END
$$;

-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'HANDBOOK_PROTOCOL_UPDATE';

-- CreateTable: a disease may hold several complete treatment protocols
CREATE TABLE IF NOT EXISTS "disease_protocol" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "diseaseId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "note" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "disease_protocol_pkey" PRIMARY KEY ("id")
);

-- CreateTable: one drug line, dose expressed per unit of area
CREATE TABLE IF NOT EXISTS "disease_protocol_item" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "protocolId" TEXT NOT NULL,
  "productId" TEXT,
  "activeIngredient" TEXT,
  "doseAmount" DECIMAL(18,6) NOT NULL,
  "doseUnit" TEXT NOT NULL,
  "perAreaAmount" DECIMAL(18,6) NOT NULL,
  "perAreaUnit" "AreaUnit" NOT NULL DEFAULT 'M2',
  "mixing" TEXT,
  "usage" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "disease_protocol_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "disease_protocol_tenantId_diseaseId_idx" ON "disease_protocol"("tenantId", "diseaseId");
CREATE INDEX IF NOT EXISTS "disease_protocol_item_protocolId_idx" ON "disease_protocol_item"("protocolId");
CREATE INDEX IF NOT EXISTS "disease_protocol_item_tenantId_productId_idx" ON "disease_protocol_item"("tenantId", "productId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disease_protocol_diseaseId_fkey') THEN
    ALTER TABLE "disease_protocol"
      ADD CONSTRAINT "disease_protocol_diseaseId_fkey"
      FOREIGN KEY ("diseaseId") REFERENCES "disease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disease_protocol_item_protocolId_fkey') THEN
    ALTER TABLE "disease_protocol_item"
      ADD CONSTRAINT "disease_protocol_item_protocolId_fkey"
      FOREIGN KEY ("protocolId") REFERENCES "disease_protocol"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disease_protocol_item_productId_fkey') THEN
    ALTER TABLE "disease_protocol_item"
      ADD CONSTRAINT "disease_protocol_item_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

-- A drug line is meaningless without either a concrete product or an active ingredient.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'disease_protocol_item_target_present') THEN
    ALTER TABLE "disease_protocol_item"
      ADD CONSTRAINT "disease_protocol_item_target_present"
      CHECK ("productId" IS NOT NULL OR "activeIngredient" IS NOT NULL);
  END IF;
END
$$;
