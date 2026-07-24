import { beforeEach, describe, expect, it, vi } from "vitest";
import { userFetch } from "@/lib/user-fetch";
import {
	completeTenantStockAdjustment,
	createTenantStockAdjustment,
	getTenantStockAdjustment,
	listTenantStockAdjustments,
} from "./tenant-stock-adjustments-api";

vi.mock("@/lib/user-fetch", () => ({ userFetch: vi.fn() }));
const mocked = vi.mocked(userFetch);

describe("tenant stock adjustments api", () => {
	beforeEach(() => mocked.mockReset());

	it("lists adjustments through the authenticated tenant route", () => {
		listTenantStockAdjustments({ page: 2, pageSize: 20, status: "DRAFT" });
		expect(mocked).toHaveBeenCalledWith(
			"/tenant/stock-adjustments?page=2&pageSize=20&status=DRAFT",
		);
	});

	it("bounds list pagination at the frontend contract limit", () => {
		listTenantStockAdjustments({ page: 0, pageSize: 100 });
		expect(mocked).toHaveBeenCalledWith(
			"/tenant/stock-adjustments?page=1&pageSize=20",
		);
		listTenantStockAdjustments({ page: Number.NaN, pageSize: Number.NaN });
		expect(mocked).toHaveBeenLastCalledWith(
			"/tenant/stock-adjustments?page=1&pageSize=20",
		);
	});

	it("uses the canonical first page by default", () => {
		listTenantStockAdjustments();
		expect(mocked).toHaveBeenCalledWith(
			"/tenant/stock-adjustments?page=1&pageSize=20",
		);
	});

	it("loads an adjustment detail without a tenant id", () => {
		getTenantStockAdjustment("adjustment-1");
		expect(mocked).toHaveBeenCalledWith(
			"/tenant/stock-adjustments/adjustment-1",
		);
	});

	it("preserves signed decimal strings and sends the create contract", () => {
		createTenantStockAdjustment({
			warehouseId: "warehouse-1",
			note: "Kiểm kê cuối ngày",
			lines: [
				{
					productId: "product-1",
					delta: "-0.125",
					reasonCode: "DAMAGE",
					batchId: "batch-1",
				},
			],
		});
		expect(mocked).toHaveBeenCalledWith(
			"/tenant/stock-adjustments",
			expect.objectContaining({ method: "POST" }),
		);
		expect(JSON.parse(String(mocked.mock.calls[0][1]?.body))).toEqual({
			warehouseId: "warehouse-1",
			note: "Kiểm kê cuối ngày",
			lines: [
				{
					productId: "product-1",
					delta: "-0.125",
					reasonCode: "DAMAGE",
					batchId: "batch-1",
				},
			],
		});
	});

	it("completes through the dedicated route without a body", () => {
		completeTenantStockAdjustment("adjustment-1");
		expect(mocked).toHaveBeenCalledWith(
			"/tenant/stock-adjustments/adjustment-1/complete",
			{ method: "POST" },
		);
	});

	it("lets structured userFetch errors propagate", async () => {
		const error = {
			status: 422,
			reason: "INVALID_DELTA",
			serverMessage: "Sai delta",
		};
		mocked.mockRejectedValueOnce(error);
		await expect(getTenantStockAdjustment("bad-id")).rejects.toEqual(error);
	});
});
