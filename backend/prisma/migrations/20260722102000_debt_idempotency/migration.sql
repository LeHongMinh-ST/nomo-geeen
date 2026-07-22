-- Add a nullable replay key. Existing vouchers remain valid.
ALTER TABLE "payment_voucher" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "payment_voucher_tenantId_idempotencyKey_key" ON "payment_voucher"("tenantId", "idempotencyKey");

-- Rollback (manual, after verifying no callers rely on replay keys):
-- DROP INDEX "payment_voucher_tenantId_idempotencyKey_key";
-- ALTER TABLE "payment_voucher" DROP COLUMN "idempotencyKey";
