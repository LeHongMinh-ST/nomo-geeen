import { describe, expect, it } from "vitest";
import { mapSalesApiError } from "./sales-api-error";

const STOCK = "Một sản phẩm vừa hết tồn. Vui lòng kiểm tra lại giỏ hàng.";
const CUSTOMER =
	"Khách hàng chưa có trong dữ liệu thật. Vui lòng chọn khách hợp lệ hoặc bán khách lẻ.";
const FALLBACK = "Không thể hoàn tất đơn. Giỏ hàng vẫn được giữ để thử lại.";

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

describe("mapSalesApiError", () => {
	it.each([
		["PRODUCT_LOCKED", "Sản phẩm đang bị khóa, không thể bán."],
		["PRODUCT_RECALLED", "Sản phẩm đã thu hồi, không thể bán."],
		["PRODUCT_INACTIVE", "Sản phẩm ngừng kinh doanh, không thể bán."],
		["PRODUCT_UNSELLABLE", "Sản phẩm không hợp lệ hoặc không bán được."],
		["INSUFFICIENT_STOCK", STOCK],
		["INVALID_CUSTOMER", CUSTOMER],
	] as const)("maps %s to locked VI copy", (reason, message) => {
		expect(mapSalesApiError(err(reason))).toBe(message);
		expect(mapSalesApiError({ reason })).toBe(message);
		expect(mapSalesApiError(reason)).toBe(message);
	});

	it("unknown reason uses default fallback (not Error.message)", () => {
		const e = err("WEIRD_CODE", "English from Nest");
		expect(mapSalesApiError(e)).toBe(FALLBACK);
		expect(mapSalesApiError(e)).not.toBe("English from Nest");
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

	it("eligibility reasons are distinct non-empty", () => {
		const msgs = [
			"PRODUCT_LOCKED",
			"PRODUCT_RECALLED",
			"PRODUCT_INACTIVE",
			"PRODUCT_UNSELLABLE",
		].map((r) => mapSalesApiError({ reason: r }));
		expect(new Set(msgs).size).toBe(4);
		for (const m of msgs) expect(m.length).toBeGreaterThan(0);
	});
});
