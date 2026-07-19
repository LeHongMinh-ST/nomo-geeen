-- Permission labels (R7.5+). Optional columns; existing rows stay readable.
-- label/group/description: hien thi tieng Viet cho admin UI; group = resource nhom theo nghiep vu.

ALTER TABLE "permission"
  ADD COLUMN IF NOT EXISTS "group" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "label" VARCHAR(200),
  ADD COLUMN IF NOT EXISTS "description" VARCHAR(500);

CREATE INDEX IF NOT EXISTS "permission_group_idx" ON "permission" ("group");
