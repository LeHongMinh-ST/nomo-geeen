-- CreateEnum
CREATE TYPE "HandbookCategory" AS ENUM (
  'CROP_PROTECTION_AND_FERTILIZER',
  'CROP_SEEDLINGS',
  'ANIMAL_FEED',
  'VETERINARY_DRUGS',
  'LIVESTOCK',
  'UNCATEGORIZED'
);

-- AlterTable
ALTER TABLE "disease" ADD COLUMN "handbookCategory" "HandbookCategory" NOT NULL DEFAULT 'UNCATEGORIZED';

-- Backfill from legacy AgriDomain (lossless: AQUACULTURE/GENERAL stay UNCATEGORIZED)
UPDATE "disease"
SET "handbookCategory" = CASE "domain"::text
  WHEN 'CROP' THEN 'CROP_PROTECTION_AND_FERTILIZER'::"HandbookCategory"
  WHEN 'LIVESTOCK' THEN 'VETERINARY_DRUGS'::"HandbookCategory"
  ELSE 'UNCATEGORIZED'::"HandbookCategory"
END;

-- CreateIndex
CREATE INDEX "disease_tenantId_handbookCategory_idx" ON "disease"("tenantId", "handbookCategory");
