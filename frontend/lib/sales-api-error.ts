/** Tenant structured API `reason` → Vietnamese message (pure, no I/O). */

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
	| "INSUFFICIENT_BATCH"
	| "INVALID_CUSTOMER"
	| "IDEMPOTENCY_CONFLICT"
	| "DRAFT_SETTLEMENT_FORBIDDEN"
	| "INVALID_PAYMENT"
	| "MONEY_OUT_OF_RANGE"
	| "INVALID_QUANTITY"
	| "INVALID_QTY"
	| "INVALID_HANDBOOK_ENTRY"
	| "INVALID_UNIT"
	| "INVALID_DISCOUNT"
	| "INVALID_STATE"
	| "INVALID_PRODUCT"
	| "INVALID_SUPPLIER"
	| "INVALID_CONVERSION"
	| "INVALID_WAREHOUSE"
	| "INVALID_REASON"
	| "INVALID_TRANSITION"
	| "INVALID_REPORT_RANGE"
	| "REPORT_RANGE_TOO_LARGE"
	| "BATCH_REQUIRED"
	| "BATCH_EXPIRY_REQUIRED"
	| "BATCH_EXPIRED_INBOUND"
	| "BATCH_RECALLED_INBOUND"
	| "BATCH_NOT_FOUND"
	| "NOT_LIVESTOCK"
	| "SAME_STATE"
	| "STALE_VERSION"
	| "CONCURRENT_MODIFICATION"
	| "SERIALIZATION_CONFLICT"
	| "SALE_ALREADY_RETURNED"
	| "SALE_NOT_RETURNABLE"
	| "PURCHASE_ALREADY_RETURNED"
	| "PURCHASE_NOT_RETURNABLE"
	| "VALIDATION_ERROR"
	| "NETWORK_ERROR"
	| "NO_SUBSCRIPTION"
	| "SUBSCRIPTION_EXPIRED"
	| "SUBSCRIPTION_CANCELLED"
	| "ENTITLEMENT_UNAVAILABLE"
	| "ALREADY_COMPLETED"
	| string;

const DEFAULT_FALLBACK =
	"Không thể hoàn tất đơn. Giỏ hàng vẫn được giữ để thử lại.";

/** Locked UX copy — R1.2 stock/customer byte-identical to quick-sale. */
const REASON_MESSAGES: Record<string, string> = {
	// Sale eligibility / regulatory
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
	INSUFFICIENT_BATCH:
		"Lô hàng không đủ số lượng. Vui lòng kiểm tra lại lô và số lượng.",
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
	INVALID_QTY: "Số lượng không hợp lệ. Vui lòng kiểm tra lại.",
	INVALID_HANDBOOK_ENTRY:
		"Thông tin bệnh không hợp lệ. Vui lòng chọn lại thông tin phù hợp.",
	INVALID_UNIT: "Đơn vị bán không hợp lệ. Vui lòng chọn lại đơn vị sản phẩm.",
	INVALID_DISCOUNT: "Mức giảm giá không hợp lệ. Vui lòng kiểm tra lại.",
	INVALID_STATE: "Trạng thái đã thay đổi. Vui lòng tải lại rồi thử lại.",
	INVALID_PRODUCT: "Sản phẩm không hợp lệ. Vui lòng chọn lại sản phẩm.",
	INVALID_SUPPLIER:
		"Nhà cung cấp không hợp lệ. Vui lòng chọn lại nhà cung cấp.",
	INVALID_CONVERSION:
		"Quy đổi đơn vị không hợp lệ. Vui lòng kiểm tra đơn vị sản phẩm.",
	INVALID_WAREHOUSE: "Kho không hợp lệ. Vui lòng chọn lại kho.",
	INVALID_REASON: "Lý do không hợp lệ với loại sản phẩm. Vui lòng chọn lại.",
	INVALID_TRANSITION:
		"Không thể chuyển trạng thái vật nuôi theo hướng này. Vui lòng kiểm tra lại.",
	INVALID_REPORT_RANGE:
		"Khoảng thời gian báo cáo không hợp lệ. Vui lòng chọn lại ngày.",
	REPORT_RANGE_TOO_LARGE:
		"Khoảng thời gian báo cáo quá dài. Vui lòng thu hẹp khoảng ngày.",
	// Batch / FEFO / inbound
	BATCH_REQUIRED: "Cần chọn hoặc nhập lô hàng. Vui lòng bổ sung thông tin lô.",
	BATCH_EXPIRY_REQUIRED:
		"Lô hàng bắt buộc có hạn sử dụng. Vui lòng nhập hạn sử dụng.",
	BATCH_EXPIRED_INBOUND:
		"Không thể nhập lô đã hết hạn. Vui lòng kiểm tra hạn sử dụng.",
	BATCH_RECALLED_INBOUND:
		"Không thể nhập lô đã thu hồi. Vui lòng chọn lô khác.",
	BATCH_NOT_FOUND: "Không tìm thấy lô hàng. Vui lòng tải lại và thử lại.",
	// Livestock state / CAS
	NOT_LIVESTOCK:
		"Sản phẩm không phải vật nuôi. Không thể đổi trạng thái sức khỏe.",
	SAME_STATE: "Trạng thái vật nuôi không thay đổi. Không cần cập nhật.",
	STALE_VERSION:
		"Dữ liệu vừa được cập nhật bởi người khác. Vui lòng tải lại rồi thử lại.",
	CONCURRENT_MODIFICATION:
		"Dữ liệu vừa được thay đổi. Vui lòng tải lại rồi thử lại.",
	SERIALIZATION_CONFLICT:
		"Hệ thống đang xử lý giao dịch khác. Vui lòng thử lại sau.",
	// Returns (user-actionable)
	SALE_ALREADY_RETURNED: "Đơn hàng này đã được hoàn trả trước đó.",
	SALE_NOT_RETURNABLE: "Chỉ đơn hàng đã hoàn thành mới có thể hoàn trả.",
	PURCHASE_ALREADY_RETURNED: "Phiếu nhập này đã được trả hàng trước đó.",
	PURCHASE_NOT_RETURNABLE: "Chỉ phiếu nhập đã hoàn thành mới có thể trả hàng.",
	ALREADY_COMPLETED: "Phiếu đã được hoàn tất trước đó. Vui lòng tải lại.",
	VALIDATION_ERROR: "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.",
	NETWORK_ERROR:
		"Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.",
	NO_SUBSCRIPTION:
		"Cửa hàng chưa được cấp gói dịch vụ. Vui lòng liên hệ quản trị viên để được hỗ trợ.",
	SUBSCRIPTION_EXPIRED:
		"Gói dịch vụ của cửa hàng đã hết hạn. Vui lòng liên hệ quản trị viên để được gia hạn.",
	SUBSCRIPTION_CANCELLED:
		"Gói dịch vụ của cửa hàng đã bị hủy. Vui lòng liên hệ quản trị viên để được hỗ trợ.",
	ENTITLEMENT_UNAVAILABLE:
		"Chưa thể kiểm tra gói dịch vụ. Vui lòng thử lại hoặc liên hệ quản trị viên.",
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
 * Map a thrown tenant API error (or reason string) to safe Vietnamese copy.
 * Reads top-level `reason` only; never prefers raw Error.message.
 * Unknown / internal codes → `fallback` (never blank when default used).
 */
export function mapTenantApiError(
	error: unknown,
	fallback: string = DEFAULT_FALLBACK,
): string {
	const reason = extractReason(error);
	if (!reason) return fallback;
	return REASON_MESSAGES[reason] ?? fallback;
}

/** @deprecated Prefer mapTenantApiError for non-sales paths; same implementation. */
export function mapSalesApiError(
	error: unknown,
	fallback: string = DEFAULT_FALLBACK,
): string {
	return mapTenantApiError(error, fallback);
}
