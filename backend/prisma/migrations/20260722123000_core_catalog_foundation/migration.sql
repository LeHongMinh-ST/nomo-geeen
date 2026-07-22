CREATE TYPE "BusinessGroup" AS ENUM ('CROP_INPUTS', 'CROP_SEEDLINGS', 'ANIMAL_FEED', 'VETERINARY_DRUGS', 'LIVESTOCK');

ALTER TYPE "ProductKind" ADD VALUE 'SEED';
ALTER TYPE "ProductKind" ADD VALUE 'SEEDLING';
ALTER TABLE "product" ADD COLUMN "businessGroup" "BusinessGroup";

CREATE TABLE "tenant_business_group" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "businessGroup" "BusinessGroup" NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_business_group_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_business_group_tenantId_businessGroup_key" ON "tenant_business_group"("tenantId", "businessGroup");
CREATE INDEX "tenant_business_group_tenantId_enabled_idx" ON "tenant_business_group"("tenantId", "enabled");
CREATE INDEX "product_tenantId_businessGroup_idx" ON "product"("tenantId", "businessGroup");
ALTER TABLE "tenant_business_group" ADD CONSTRAINT "tenant_business_group_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
