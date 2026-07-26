-- Catalog §14.1:
--   1. Supplier: them "province" (tinh/thanh pho) + doi supplierType free text -> enum dong.
--   2. PurchaseLine: them "manufacturedAt" (ngay san xuat) de receive co the ghi
--      ProductBatch.manufacturedAt.
--
-- Chuyen doi supplierType la best-effort va KHONG xoa dong nao: gia tri khong nhan dang
-- duoc se thanh NULL. Bang token duoi day PHAI dong bo voi
-- backend/src/platform/suppliers/supplier-type.ts (mapSupplierType).
-- nomo_fold_search() da duoc tao o migration 20260726091000: bo dau, lowercase, gom moi
-- ky tu khong phai a-z0-9 thanh 1 dau cach, trim => khop token theo tu.

CREATE TYPE "SupplierType" AS ENUM ('CROP_PROTECTION', 'FERTILIZER', 'BOTH');

ALTER TABLE "supplier" ADD COLUMN "province" TEXT;
ALTER TABLE "supplier" ADD COLUMN "supplierTypeEnum" "SupplierType";

UPDATE "supplier" s
SET "supplierTypeEnum" = mapped.value
FROM (
  SELECT
    m."id",
    CASE
      WHEN (m."isCropProtection" AND m."isFertilizer") OR m."isBoth" THEN 'BOTH'::"SupplierType"
      WHEN m."isCropProtection" THEN 'CROP_PROTECTION'::"SupplierType"
      WHEN m."isFertilizer" THEN 'FERTILIZER'::"SupplierType"
      ELSE NULL
    END AS value
  FROM (
    SELECT
      f."id",
      f."padded" LIKE ANY (ARRAY[
        '% crop protection %',
        '% plant protection %',
        '% pesticide %',
        '% pesticides %',
        '% bvtv %',
        '% bao ve thuc vat %',
        '% thuoc sau %',
        '% thuoc tru sau %'
      ]) AS "isCropProtection",
      f."padded" LIKE ANY (ARRAY[
        '% fertilizer %',
        '% fertilizers %',
        '% fertiliser %',
        '% fertilisers %',
        '% phan bon %'
      ]) AS "isFertilizer",
      f."padded" LIKE ANY (ARRAY[
        '% both %',
        '% ca hai %',
        '% ca 2 %'
      ]) AS "isBoth"
    FROM (
      SELECT "id", ' ' || nomo_fold_search("supplierType") || ' ' AS "padded"
      FROM "supplier"
      WHERE "supplierType" IS NOT NULL
    ) f
  ) m
) mapped
WHERE s."id" = mapped."id";

ALTER TABLE "supplier" DROP COLUMN "supplierType";
ALTER TABLE "supplier" RENAME COLUMN "supplierTypeEnum" TO "supplierType";

ALTER TABLE "purchase_line" ADD COLUMN "manufacturedAt" DATE;
