-- Additive sales-order lifecycle foundation. Existing rows and quick-sale behavior remain valid.
ALTER TYPE "StockReason" ADD VALUE 'SALE_CANCEL';
ALTER TABLE "sale" ADD COLUMN "note" TEXT;
CREATE INDEX "sale_tenantId_channel_status_soldAt_idx" ON "sale"("tenantId", "channel", "status", "soldAt");

-- Application rollback must leave these additive objects in place. No destructive down migration.
