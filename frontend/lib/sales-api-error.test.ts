import { describe, expect, it } from "vitest";
import { mapSalesApiError, mapTenantApiError } from "./sales-api-error";

const FALLBACK = "Không thể hoàn tất đơn. Giỏ hàng vẫn được giữ để thử lại.";

const MAPPED_REASONS = [
	["PRODUCT_LOCKED", "Sản phẩm đang bị khóa, không thể bán."],
	[
		"NO_SUBSCRIPTION",
		"Cửa hàng chưa được cấp gói dịch vụ. Vui lòng liên hệ quản trị viên để được hỗ trợ.",
	],
	["PRODUCT_RECALLED", "Sản phẩm đã thu hồi, không thể bán."],
	["PRODUCT_INACTIVE", "Sản phẩm ngừng kinh doanh, không thể bán."],
	["PRODUCT_UNSELLABLE", "Sản phẩm không hợp lệ hoặc không bán được."],
	[
		"PRODUCT_LIVESTOCK_UNSELLABLE",
		"Vật nuôi đang ở trạng thái không thể bán. Vui lòng kiểm tra lại sản phẩm.",
	],
	[
		"PRODUCT_PHI_ACTIVE",
		"Sản phẩm chưa hết thời gian cách ly trước thu hoạch. Vui lòng kiểm tra lại ngày thu hoạch.",
	],
	[
		"PRODUCT_WITHDRAWAL_ACTIVE",
		"Sản phẩm chưa hết thời gian ngưng sử dụng. Vui lòng kiểm tra lại ngày xuất bán.",
	],
	[
		"INSUFFICIENT_STOCK",
		"Một sản phẩm vừa hết tồn. Vui lòng kiểm tra lại giỏ hàng.",
	],
	[
		"INSUFFICIENT_ELIGIBLE_BATCH",
		"Không còn lô hàng hợp lệ đủ tồn để bán. Vui lòng kiểm tra lại lô hàng.",
	],
	[
		"INSUFFICIENT_BATCH",
		"Lô hàng không đủ số lượng. Vui lòng kiểm tra lại lô và số lượng.",
	],
	[
		"INVALID_CUSTOMER",
		"Khách hàng chưa có trong dữ liệu thật. Vui lòng chọn khách hợp lệ hoặc bán khách lẻ.",
	],
	[
		"IDEMPOTENCY_CONFLICT",
		"Đơn hàng đã được gửi với dữ liệu khác. Vui lòng tải lại và thử lại.",
	],
	[
		"DRAFT_SETTLEMENT_FORBIDDEN",
		"Đơn nháp không thể có thông tin thanh toán. Vui lòng lưu lại rồi thanh toán khi hoàn tất.",
	],
	[
		"INVALID_PAYMENT",
		"Thông tin thanh toán chưa hợp lệ. Vui lòng kiểm tra lại.",
	],
	[
		"MONEY_OUT_OF_RANGE",
		"Giá trị tiền không hợp lệ. Vui lòng kiểm tra lại giá và giảm giá.",
	],
	[
		"INVALID_QUANTITY",
		"Số lượng sản phẩm không hợp lệ. Vui lòng kiểm tra lại.",
	],
	["INVALID_QTY", "Số lượng không hợp lệ. Vui lòng kiểm tra lại."],
	[
		"INVALID_HANDBOOK_ENTRY",
		"Thông tin bệnh không hợp lệ. Vui lòng chọn lại thông tin phù hợp.",
	],
	[
		"INVALID_UNIT",
		"Đơn vị bán không hợp lệ. Vui lòng chọn lại đơn vị sản phẩm.",
	],
	["INVALID_DISCOUNT", "Mức giảm giá không hợp lệ. Vui lòng kiểm tra lại."],
	["INVALID_STATE", "Trạng thái đã thay đổi. Vui lòng tải lại rồi thử lại."],
	["INVALID_PRODUCT", "Sản phẩm không hợp lệ. Vui lòng chọn lại sản phẩm."],
	[
		"INVALID_SUPPLIER",
		"Nhà cung cấp không hợp lệ. Vui lòng chọn lại nhà cung cấp.",
	],
	[
		"INVALID_CONVERSION",
		"Quy đổi đơn vị không hợp lệ. Vui lòng kiểm tra đơn vị sản phẩm.",
	],
	["INVALID_WAREHOUSE", "Kho không hợp lệ. Vui lòng chọn lại kho."],
	[
		"INVALID_REASON",
		"Lý do không hợp lệ với loại sản phẩm. Vui lòng chọn lại.",
	],
	[
		"INVALID_TRANSITION",
		"Không thể chuyển trạng thái vật nuôi theo hướng này. Vui lòng kiểm tra lại.",
	],
	[
		"INVALID_REPORT_RANGE",
		"Khoảng thời gian báo cáo không hợp lệ. Vui lòng chọn lại ngày.",
	],
	[
		"REPORT_RANGE_TOO_LARGE",
		"Khoảng thời gian báo cáo quá dài. Vui lòng thu hẹp khoảng ngày.",
	],
	[
		"BATCH_REQUIRED",
		"Cần chọn hoặc nhập lô hàng. Vui lòng bổ sung thông tin lô.",
	],
	[
		"BATCH_EXPIRY_REQUIRED",
		"Lô hàng bắt buộc có hạn sử dụng. Vui lòng nhập hạn sử dụng.",
	],
	[
		"BATCH_EXPIRED_INBOUND",
		"Không thể nhập lô đã hết hạn. Vui lòng kiểm tra hạn sử dụng.",
	],
	[
		"BATCH_RECALLED_INBOUND",
		"Không thể nhập lô đã thu hồi. Vui lòng chọn lô khác.",
	],
	["BATCH_NOT_FOUND", "Không tìm thấy lô hàng. Vui lòng tải lại và thử lại."],
	[
		"NOT_LIVESTOCK",
		"Sản phẩm không phải vật nuôi. Không thể đổi trạng thái sức khỏe.",
	],
	["SAME_STATE", "Trạng thái vật nuôi không thay đổi. Không cần cập nhật."],
	[
		"STALE_VERSION",
		"Dữ liệu vừa được cập nhật bởi người khác. Vui lòng tải lại rồi thử lại.",
	],
	[
		"CONCURRENT_MODIFICATION",
		"Dữ liệu vừa được thay đổi. Vui lòng tải lại rồi thử lại.",
	],
	[
		"SERIALIZATION_CONFLICT",
		"Hệ thống đang xử lý giao dịch khác. Vui lòng thử lại sau.",
	],
	["SALE_ALREADY_RETURNED", "Đơn hàng này đã được hoàn trả trước đó."],
	["SALE_NOT_RETURNABLE", "Chỉ đơn hàng đã hoàn thành mới có thể hoàn trả."],
	["PURCHASE_ALREADY_RETURNED", "Phiếu nhập này đã được trả hàng trước đó."],
	[
		"PURCHASE_NOT_RETURNABLE",
		"Chỉ phiếu nhập đã hoàn thành mới có thể trả hàng.",
	],
	["VALIDATION_ERROR", "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại."],
	[
		"NETWORK_ERROR",
		"Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.",
	],
	["ALREADY_COMPLETED", "Phiếu đã được hoàn tất trước đó. Vui lòng tải lại."],
] as const;

function err(
	reason?: string,
	message = "raw nest message",
): Error & {
	reason?: string;
	status?: number;
} {
	const e = new Error(message) as Error & {
		reason?: string;
		status?: number;
	};
	if (reason !== undefined) e.reason = reason;
	return e;
}

describe("mapTenantApiError / mapSalesApiError", () => {
	it.each(MAPPED_REASONS)("maps %s to safe VI copy", (reason, message) => {
		expect(mapTenantApiError(err(reason))).toBe(message);
		expect(mapSalesApiError({ reason })).toBe(message);
		expect(mapSalesApiError(reason)).toBe(message);
	});

	it("maps every reason to a non-empty, distinct-safe copy", () => {
		const messages = MAPPED_REASONS.map(([reason]) =>
			mapTenantApiError({ reason }),
		);
		expect(messages).toHaveLength(MAPPED_REASONS.length);
		for (const message of messages) {
			expect(message).toBeTruthy();
			expect(message).not.toContain("raw nest message");
		}
	});

	it("unknown reason uses default fallback (not Error.message)", () => {
		const e = err("WEIRD_CODE", "English from Nest");
		expect(mapSalesApiError(e)).toBe(FALLBACK);
		expect(mapSalesApiError(e)).not.toBe("English from Nest");
	});

	it.each([
		"UNSAFE_PERSISTED_MONEY",
		"WAREHOUSE_CONFIGURATION_ERROR",
		"STOCK_COMPENSATION_CONFLICT",
		"DEBT_COMPENSATION_CONFLICT",
		"STOCK_RETURN_CONFLICT",
		"BATCH_RETURN_CONFLICT",
		"DEBT_RETURN_CONFLICT",
	])("keeps internal reason %s on fallback", (reason) => {
		expect(mapSalesApiError(err(reason, "Internal server detail"))).toBe(
			FALLBACK,
		);
	});

	it("missing reason uses default fallback", () => {
		expect(mapSalesApiError(new Error("only message"))).toBe(FALLBACK);
		expect(mapSalesApiError({})).toBe(FALLBACK);
		expect(mapSalesApiError(null)).toBe(FALLBACK);
		expect(mapSalesApiError(undefined)).toBe(FALLBACK);
	});

	it("custom fallback overrides default", () => {
		expect(mapSalesApiError(err("UNKNOWN"), "Tuỳ chỉnh")).toBe("Tuỳ chỉnh");
		expect(mapSalesApiError(null, "Tuỳ chỉnh")).toBe("Tuỳ chỉnh");
	});

	it("mapSalesApiError aliases mapTenantApiError", () => {
		expect(mapSalesApiError({ reason: "BATCH_REQUIRED" })).toBe(
			mapTenantApiError({ reason: "BATCH_REQUIRED" }),
		);
	});
});
