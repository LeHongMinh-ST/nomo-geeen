import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTenantStockAdjustment } from "@/lib/tenant-stock-adjustments-api";
import { AdjustmentDetail } from "./adjustment-detail";

vi.mock("@/lib/tenant-stock-adjustments-api", () => ({
	getTenantStockAdjustment: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const mockedGet = vi.mocked(getTenantStockAdjustment);

describe("AdjustmentDetail", () => {
	beforeEach(() => mockedGet.mockReset());

	it("shows signed quantities and read-only completed feedback", async () => {
		mockedGet.mockResolvedValue({
			id: "a1",
			docNo: "ADJ-001",
			warehouseId: "w1",
			status: "COMPLETED",
			note: "Kiểm kê",
			createdBy: null,
			createdAt: "2026-07-24T00:00:00Z",
			lines: [
				{
					id: "l1",
					productId: "p1",
					batchId: "b1",
					qtyBefore: "10",
					qtyAfter: "9",
					delta: "-1",
					reasonCode: "LOSS",
				},
			],
		});
		render(<AdjustmentDetail id="a1" />);
		expect(await screen.findByText("ADJ-001")).toBeInTheDocument();
		expect(screen.getByText("−1")).toBeInTheDocument();
		expect(
			screen.getByText("Phiếu đã hoàn tất và chỉ đọc."),
		).toBeInTheDocument();
	});
});
