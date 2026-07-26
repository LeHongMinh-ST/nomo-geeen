-- Backfill the denormalized search columns with diacritic-free text so that unaccented
-- input ("da") matches accented names ("Đạo ôn"). Uses translate(), which is built into
-- PostgreSQL — no extension required.
--
-- Keep this character map in sync with normalizeVietnameseSearch() in
-- backend/src/platform/handbook/vietnamese-search.ts.

CREATE OR REPLACE FUNCTION nomo_fold_search(input TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT btrim(
    regexp_replace(
      lower(
        translate(
          COALESCE(input, ''),
          'àáạảãâầấậẩẫăằắặẳẵÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴ' ||
          'èéẹẻẽêềếệểễÈÉẸẺẼÊỀẾỆỂỄ' ||
          'ìíịỉĩÌÍỊỈĨ' ||
          'òóọỏõôồốộổỗơờớợởỡÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠ' ||
          'ùúụủũưừứựửữÙÚỤỦŨƯỪỨỰỬỮ' ||
          'ỳýỵỷỹỲÝỴỶỸ' ||
          'đĐ',
          'aaaaaaaaaaaaaaaaaAAAAAAAAAAAAAAAAA' ||
          'eeeeeeeeeeeEEEEEEEEEEE' ||
          'iiiiiIIIII' ||
          'ooooooooooooooooo' || 'OOOOOOOOOOOOOOOOO' ||
          'uuuuuuuuuuuUUUUUUUUUUU' ||
          'yyyyyYYYYY' ||
          'dD'
        )
      ),
      '[^a-z0-9]+', ' ', 'g'
    )
  );
$$;

UPDATE "disease"
SET "nameSearch" = nomo_fold_search("name")
WHERE "name" IS NOT NULL
  AND ("nameSearch" IS DISTINCT FROM nomo_fold_search("name"));

-- aliases is a JSON array of strings; flatten it before folding.
UPDATE "disease" d
SET "aliasesSearch" = sub.folded
FROM (
  SELECT
    d2."id",
    NULLIF(
      nomo_fold_search(
        COALESCE(
          (
            SELECT string_agg(alias.value, ' ')
            FROM jsonb_array_elements_text(
              CASE
                WHEN jsonb_typeof(d2."aliases"::jsonb) = 'array' THEN d2."aliases"::jsonb
                ELSE '[]'::jsonb
              END
            ) AS alias(value)
          ),
          ''
        )
      ),
      ''
    ) AS folded
  FROM "disease" d2
) AS sub
WHERE d."id" = sub."id"
  AND d."aliasesSearch" IS DISTINCT FROM sub.folded;

UPDATE "product"
SET "nameSearch" = nomo_fold_search("name")
WHERE "name" IS NOT NULL
  AND ("nameSearch" IS DISTINCT FROM nomo_fold_search("name"));

UPDATE "customer"
SET "nameSearch" = nomo_fold_search("name")
WHERE "name" IS NOT NULL
  AND ("nameSearch" IS DISTINCT FROM nomo_fold_search("name"));
