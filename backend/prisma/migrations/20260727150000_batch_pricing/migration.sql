ALTER TABLE "product_batch"
  ADD COLUMN "purchaseCost" BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN "salePrice" BIGINT NOT NULL DEFAULT 0;

ALTER TABLE "purchase_line"
  ADD COLUMN "salePrice" BIGINT;
