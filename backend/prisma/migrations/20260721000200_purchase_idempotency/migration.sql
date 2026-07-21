ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "purchase_tenantId_idempotencyKey_key" ON "purchase"("tenantId", "idempotencyKey");
ALTER TABLE "purchase" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT NOT NULL DEFAULT 'CASH';
