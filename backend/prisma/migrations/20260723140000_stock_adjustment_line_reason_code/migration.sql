-- Additive: require reasonCode on stock adjustment lines (closed app-layer vocabulary).
-- Empty table expected in greenfield; default only for safe migrate if residual rows exist.
ALTER TABLE "stock_adjustment_line" ADD COLUMN "reasonCode" TEXT NOT NULL DEFAULT 'COUNT_CORRECTION';

-- Drop default so new rows must set reasonCode explicitly via application.
ALTER TABLE "stock_adjustment_line" ALTER COLUMN "reasonCode" DROP DEFAULT;
