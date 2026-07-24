ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'PURCHASE_RETURN';

CREATE TABLE "purchase_return" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "docNo" TEXT NOT NULL,
  "originalPurchaseId" TEXT,
  "supplierId" TEXT NOT NULL,
  "warehouseId" TEXT NOT NULL,
  "status" "PurchaseStatus" NOT NULL DEFAULT 'COMPLETED',
  "total" BIGINT NOT NULL DEFAULT 0,
  "debtAdjust" BIGINT NOT NULL DEFAULT 0,
  "note" TEXT,
  "createdBy" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "purchase_return_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "purchase_return_tenantId_docNo_key" ON "purchase_return"("tenantId", "docNo");
CREATE INDEX "purchase_return_tenantId_originalPurchaseId_idx" ON "purchase_return"("tenantId", "originalPurchaseId");
ALTER TABLE "purchase_return" ADD CONSTRAINT "purchase_return_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_return" ADD CONSTRAINT "purchase_return_originalPurchaseId_fkey" FOREIGN KEY ("originalPurchaseId") REFERENCES "purchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_return" ADD CONSTRAINT "purchase_return_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_return" ADD CONSTRAINT "purchase_return_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "purchase_return_line" (
  "id" TEXT NOT NULL,
  "purchaseReturnId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "batchId" TEXT,
  "qtyBase" DECIMAL(18,6) NOT NULL,
  "lineTotal" BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT "purchase_return_line_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "purchase_return_line_purchaseReturnId_idx" ON "purchase_return_line"("purchaseReturnId");
ALTER TABLE "purchase_return_line" ADD CONSTRAINT "purchase_return_line_purchaseReturnId_fkey" FOREIGN KEY ("purchaseReturnId") REFERENCES "purchase_return"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_return_line" ADD CONSTRAINT "purchase_return_line_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_return_line" ADD CONSTRAINT "purchase_return_line_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "product_batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
