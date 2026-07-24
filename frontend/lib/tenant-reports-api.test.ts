import { beforeEach, describe, expect, it, vi } from "vitest";
import { userFetch } from "@/lib/user-fetch";
import {
	defaultReportDateRange,
	getTenantSalesSummary,
	getTenantStockSummary,
	validateReportDateRange,
} from "./tenant-reports-api";

vi.mock("@/lib/user-fetch", () => ({ userFetch: vi.fn() }));
const mocked = vi.mocked(userFetch);

describe("tenant reports api", () => {
	beforeEach(() => mocked.mockReset());

	it("loads stock summary through the tenant route", () => {
		getTenantStockSummary();
		expect(mocked).toHaveBeenCalledWith("/tenant/reports/stock-summary");
	});

	it("loads stock summary with businessGroup filter", () => {
		getTenantStockSummary({ businessGroup: "CROP_INPUTS" });
		expect(mocked).toHaveBeenCalledWith(
			"/tenant/reports/stock-summary?businessGroup=CROP_INPUTS",
		);
	});

	it("loads sales summary with from/to query", () => {
		getTenantSalesSummary({ from: "2026-06-01", to: "2026-07-01" });
		expect(mocked).toHaveBeenCalledWith(
			"/tenant/reports/sales-summary?from=2026-06-01&to=2026-07-01",
		);
	});

	it("loads sales summary with businessGroup", () => {
		getTenantSalesSummary({
			from: "2026-06-01",
			to: "2026-07-01",
			businessGroup: "ANIMAL_FEED",
		});
		expect(mocked).toHaveBeenCalledWith(
			"/tenant/reports/sales-summary?from=2026-06-01&to=2026-07-01&businessGroup=ANIMAL_FEED",
		);
	});

	it("rejects invalid sales range before calling the network", async () => {
		try {
			await getTenantSalesSummary({ from: "2026-07-10", to: "2026-07-01" });
			expect.fail("expected range validation error");
		} catch (error) {
			expect(error).toMatchObject({ reason: "INVALID_REPORT_RANGE" });
		}
		expect(mocked).not.toHaveBeenCalled();
	});

	it("rejects ranges larger than 366 days before calling the network", async () => {
		try {
			await getTenantSalesSummary({ from: "2025-01-01", to: "2026-07-01" });
			expect.fail("expected range validation error");
		} catch (error) {
			expect(error).toMatchObject({ reason: "REPORT_RANGE_TOO_LARGE" });
		}
		expect(mocked).not.toHaveBeenCalled();
	});

	it("validates and defaults report ranges", () => {
		expect(
			validateReportDateRange({ from: "2026-07-01", to: "2026-07-15" }),
		).toMatchObject({ ok: true });
		expect(validateReportDateRange({ from: "bad", to: "2026-07-15" })).toEqual({
			ok: false,
			reason: "INVALID_REPORT_RANGE",
		});
		const fixed = new Date("2026-07-24T12:00:00.000Z");
		const range = defaultReportDateRange(fixed);
		expect(range.to).toBe("2026-07-24");
		expect(range.from).toBe("2026-06-24");
	});
});
