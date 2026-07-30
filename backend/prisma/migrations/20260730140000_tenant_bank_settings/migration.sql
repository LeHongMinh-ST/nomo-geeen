-- Tenant bank account config for VietQR transfer payments.
ALTER TABLE "tenant_settings" ADD COLUMN "bankId" TEXT;
ALTER TABLE "tenant_settings" ADD COLUMN "bankName" TEXT;
ALTER TABLE "tenant_settings" ADD COLUMN "bankShortName" TEXT;
ALTER TABLE "tenant_settings" ADD COLUMN "bankAccountNumber" TEXT;
ALTER TABLE "tenant_settings" ADD COLUMN "bankAccountName" TEXT;
