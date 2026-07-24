/** POS sales API 422 reason → Vietnamese message (pure, no I/O). */

export type SalesApiErrorReason =
	| "PRODUCT_UNSELLABLE"
	| "PRODUCT_LOCKED"
	| "PRODUCT_RECALLED"
	| "PRODUCT_INACTIVE"
	| "PRODUCT_LIVESTOCK_UNSELLABLE"
	| "PRODUCT_PHI_ACTIVE"
	| "PRODUCT_WITHDRAWAL_ACTIVE"
	| "INSUFFICIENT_STOCK"
	| "INSUFFICIENT_ELIGIBLE_BATCH"
	| "INVALID_CUSTOMER"
	| "IDEMPOTENCY_CONFLICT"
	| "DRAFT_SETTLEMENT_FORBIDDEN"
	| "INVALID_PAYMENT"
	| "MONEY_OUT_OF_RANGE"
	| "INVALID_QUANTITY"
	| "INVALID_HANDBOOK_ENTRY"
	| "INVALID_UNIT"
	| "INVALID_DISCOUNT"
	| "INVALID_STATE"
	| "CONCURRENT_MODIFICATION"
	| "SERIALIZATION_CONFLICT"
	| "SALE_ALREADY_RETURNED"
	| "SALE_NOT_RETURNABLE"
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
	PRODUCT_LIVESTOCK_UNSELLABLE:
		"Vật nuôi đang ở trạng thái không thể bán. Vui lòng kiểm tra lại sản phẩm.",
	PRODUCT_PHI_ACTIVE:
		"Sản phẩm chưa hết thời gian cách ly trước thu hoạch. Vui lòng kiểm tra lại ngày thu hoạch.",
	PRODUCT_WITHDRAWAL_ACTIVE:
		"Sản phẩm chưa hết thời gian ngưng sử dụng. Vui lòng kiểm tra lại ngày xuất bán.",
	INSUFFICIENT_STOCK:
		"Một sản phẩm vừa hết tồn. Vui lòng kiểm tra lại giỏ hàng.",
	INSUFFICIENT_ELIGIBLE_BATCH:
		"Không còn lô hàng hợp lệ đủ tồn để bán. Vui lòng kiểm tra lại lô hàng.",
	INVALID_CUSTOMER:
		"Khách hàng chưa có trong dữ liệu thật. Vui lòng chọn khách hợp lệ hoặc bán khách lẻ.",
	IDEMPOTENCY_CONFLICT:
		"Đơn hàng đã được gửi với dữ liệu khác. Vui lòng tải lại và thử lại.",
	DRAFT_SETTLEMENT_FORBIDDEN:
		"Đơn nháp không thể có thông tin thanh toán. Vui lòng lưu lại rồi thanh toán khi hoàn tất.",
	INVALID_PAYMENT: "Thông tin thanh toán chưa hợp lệ. Vui lòng kiểm tra lại.",
	MONEY_OUT_OF_RANGE:
		"Giá trị tiền không hợp lệ. Vui lòng kiểm tra lại giá và giảm giá.",
	INVALID_QUANTITY: "Số lượng sản phẩm không hợp lệ. Vui lòng kiểm tra lại.",
	INVALID_HANDBOOK_ENTRY:
		"Thông tin bệnh không hợp lệ. Vui lòng chọn lại thông tin phù hợp.",
	INVALID_UNIT: "Đơn vị bán không hợp lệ. Vui lòng chọn lại đơn vị sản phẩm.",
	INVALID_DISCOUNT: "Mức giảm giá không hợp lệ. Vui lòng kiểm tra lại.",
	INVALID_STATE:
		"Trạng thái đơn hàng đã thay đổi. Vui lòng tải lại đơn hàng rồi thử lại.",
	CONCURRENT_MODIFICATION:
		"Đơn hàng vừa được thay đổi. Vui lòng tải lại đơn hàng rồi thử lại.",
	SERIALIZATION_CONFLICT:
		"Hệ thống đang xử lý giao dịch khác. Vui lòng thử lại sau.",
	SALE_ALREADY_RETURNED: "Đơn hàng này đã được hoàn trả trước đó.",
	SALE_NOT_RETURNABLE: "Chỉ đơn hàng đã hoàn thành mới có thể hoàn trả.",
	VALIDATION_ERROR: "Thông tin bán hàng chưa hợp lệ. Vui lòng kiểm tra lại.",
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
