export const STOCK_ADJUSTMENT_REASONS = [
	{ code: "DAMAGE", label: "Hư hỏng" },
	{ code: "LOSS", label: "Thất thoát" },
	{ code: "COUNT_CORRECTION", label: "Điều chỉnh kiểm kê" },
	{ code: "EXPIRY", label: "Hết hạn" },
] as const;

export type StockAdjustmentReasonCode =
	(typeof STOCK_ADJUSTMENT_REASONS)[number]["code"];
