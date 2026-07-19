-- Revert permission labels.

DROP INDEX IF EXISTS "permission_group_idx";

ALTER TABLE "permission"
  DROP COLUMN IF EXISTS "description",
  DROP COLUMN IF EXISTS "label",
  DROP COLUMN IF EXISTS "group";
