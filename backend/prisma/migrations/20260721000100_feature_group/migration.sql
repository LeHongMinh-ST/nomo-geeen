-- Keep the database schema aligned with Feature.group in schema.prisma.
ALTER TABLE "feature" ADD COLUMN IF NOT EXISTS "group" TEXT;
