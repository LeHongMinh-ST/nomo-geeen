-- CreateEnum
CREATE TYPE "TenantLicenseType" AS ENUM ('BUSINESS_ELIGIBILITY', 'PRACTICE_CERTIFICATE', 'BUSINESS_REGISTRATION', 'OTHER');

-- AlterTable
ALTER TABLE "product" ADD COLUMN     "requiresPrescription" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "tenant_license" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "licenseType" "TenantLicenseType" NOT NULL,
    "licenseNo" TEXT NOT NULL,
    "holderName" TEXT,
    "issuedBy" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "note" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_license_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banned_active_ingredient" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameNormalized" TEXT NOT NULL,
    "note" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "banned_active_ingredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenant_license_tenantId_deletedAt_idx" ON "tenant_license"("tenantId", "deletedAt");

-- CreateIndex
CREATE INDEX "tenant_license_tenantId_expiresAt_idx" ON "tenant_license"("tenantId", "expiresAt");

-- CreateIndex
CREATE INDEX "banned_active_ingredient_tenantId_deletedAt_idx" ON "banned_active_ingredient"("tenantId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "banned_active_ingredient_tenantId_nameNormalized_key" ON "banned_active_ingredient"("tenantId", "nameNormalized");

-- AddForeignKey
ALTER TABLE "tenant_license" ADD CONSTRAINT "tenant_license_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banned_active_ingredient" ADD CONSTRAINT "banned_active_ingredient_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
