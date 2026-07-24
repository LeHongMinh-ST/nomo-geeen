-- Partial returns: line linkage + idempotency

ALTER TABLE "purchase_return" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_return_tenantId_idempotencyKey_key"
  ON "purchase_return"("tenantId", "idempotencyKey");

ALTER TABLE "purchase_return_line" ADD COLUMN IF NOT EXISTS "purchaseLineId" TEXT;
CREATE INDEX IF NOT EXISTS "purchase_return_line_purchaseLineId_idx"
  ON "purchase_return_line"("purchaseLineId");

ALTER TABLE "sales_return" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "sales_return_tenantId_idempotencyKey_key"
  ON "sales_return"("tenantId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "sales_return_tenantId_originalSaleId_idx"
  ON "sales_return"("tenantId", "originalSaleId");

ALTER TABLE "sales_return_line" ADD COLUMN IF NOT EXISTS "saleLineId" TEXT;
ALTER TABLE "sales_return_line" ADD COLUMN IF NOT EXISTS "batchId" TEXT;
CREATE INDEX IF NOT EXISTS "sales_return_line_saleLineId_idx"
  ON "sales_return_line"("saleLineId");

DO $$ BEGIN
  ALTER TABLE "sales_return_line"
    ADD CONSTRAINT "sales_return_line_batchId_fkey"
    FOREIGN KEY ("batchId") REFERENCES "product_batch"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
