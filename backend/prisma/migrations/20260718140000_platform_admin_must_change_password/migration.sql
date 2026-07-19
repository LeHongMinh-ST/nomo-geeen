-- AlterTable: platform_admin.mustChangePassword was declared in schema.prisma
-- but never landed in a migration (schema drift). Additive, safe, backward-compatible.
ALTER TABLE "platform_admin" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
