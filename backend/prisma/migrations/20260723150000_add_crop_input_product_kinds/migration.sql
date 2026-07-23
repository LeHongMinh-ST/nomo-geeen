-- Additive catalog values; existing product kinds and rows remain unchanged.
ALTER TYPE "ProductKind" ADD VALUE IF NOT EXISTS 'BIOLOGICAL_PRODUCT';
ALTER TYPE "ProductKind" ADD VALUE IF NOT EXISTS 'GROWTH_REGULATOR';
ALTER TYPE "ProductKind" ADD VALUE IF NOT EXISTS 'SOIL_AMENDMENT';
