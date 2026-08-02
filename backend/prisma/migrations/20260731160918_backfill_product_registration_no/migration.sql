-- Số đăng ký lưu thông chuyển từ attrs->>'registrationNumber' sang cột chuẩn.
UPDATE "product"
SET "registrationNo" = NULLIF(TRIM("attrs" ->> 'registrationNumber'), '')
WHERE "registrationNo" IS NULL
  AND "attrs" ? 'registrationNumber'
  AND NULLIF(TRIM("attrs" ->> 'registrationNumber'), '') IS NOT NULL;

-- Bỏ key khỏi attrs để chỉ còn một nguồn sự thật.
UPDATE "product"
SET "attrs" = "attrs" - 'registrationNumber'
WHERE "attrs" ? 'registrationNumber';
