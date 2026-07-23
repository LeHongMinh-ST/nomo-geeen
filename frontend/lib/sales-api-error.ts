/** POS sales API 422 reason → Vietnamese message (pure, no I/O). */

export type SalesApiErrorReason =
	| "PRODUCT_UNSELLABLE"
	| "PRODUCT_LOCKED"
	| "PRODUCT_RECALLED"
	| "PRODUCT_INACTIVE"
	| "INSUFFICIENT_STOCK"
	| "INVALID_CUSTOMER"
	| "IDEMPOTENCY_CONFLICT"
	| "VALIDATION_ERROR"
	| string;

const DEFAULT_FALLBACK =
	"Không thể hoàn tất đơn. Giỏ hàng vẫn được giữ để thử lại.";

/** Locked UX copy — R1.2 stock/customer byte-identical to quick-sale. */
const REASON_MESSAGES: Record<string, string> = {
	PRODUCT_LOCKED: "Sản phẩm đang bị khóa, không thể bán.",
	PRODUCT_RECALLED: "Sản phẩm đã thu hồi, không thể bán.",
	PRODUCT_INACTIVE: "Sản phẩm ngừng kinh doanh, không thể bán.",
	PRODUCT_UNSELLABLE: "Sản phẩm không hợp lệ hoặc không bán được.",
	INSUFFICIENT_STOCK:
		"Một sản phẩm vừa hết tồn. Vui lòng kiểm tra lại giỏ hàng.",
	INVALID_CUSTOMER:
		"Khách hàng chưa có trong dữ liệu thật. Vui lòng chọn khách hợp lệ hoặc bán khách lẻ.",
};

function extractReason(error: unknown): string | undefined {
	if (error == null) return undefined;
	if (typeof error === "string") {
		const t = error.trim();
		return t.length > 0 ? t : undefined;
	}
	if (typeof error === "object" && "reason" in error) {
		const r = (error as { reason?: unknown }).reason;
		if (typeof r === "string" && r.trim().length > 0) return r.trim();
	}
	return undefined;
}

/**
 * Map a thrown sales API error (or reason string) to POS Vietnamese copy.
 * Reads top-level `reason` only; never prefers raw Error.message.
 */
export function mapSalesApiError(
	error: unknown,
	fallback: string = DEFAULT_FALLBACK,
): string {
	const reason = extractReason(error);
	if (!reason) return fallback;
	return REASON_MESSAGES[reason] ?? fallback;
}
