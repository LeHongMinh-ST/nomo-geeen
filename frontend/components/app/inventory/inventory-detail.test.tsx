import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTenantInventoryDetail } from "@/lib/tenant-inventory-api";
import { listTenantStockAdjustments } from "@/lib/tenant-stock-adjustments-api";
import { InventoryDetail } from "./inventory-detail";

const routerPush = vi.hoisted(() => vi.fn());

vi.mock("@/lib/tenant-inventory-api", () => ({
	getTenantInventoryDetail: vi.fn(),
}));
vi.mock("@/lib/tenant-stock-adjustments-api", () => ({
	listTenantStockAdjustments: vi.fn(),
}));
vi.mock("@/components/app/inventory/adjust-sheet", () => ({
	AdjustSheet: ({
		product,
		onSaved,
	}: {
		product: { id: string } | null;
		onSaved: (id: string) => void;
	}) =>
		product ? (
			<button type="button" onClick={() => onSaved("a1")}>
				Mock complete
			</button>
		) : null,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: routerPush }) }));

const mockedDetail = vi.mocked(getTenantInventoryDetail);
const mockedHistory = vi.mocked(listTenantStockAdjustments);
const detail = {
	productId: "p1",
	productName: "Phân bón",
	sku: "P1",
	warehouseId: "w1",
	baseUnitId: "u1",
	baseUnit: "bao",
	qty: "10",
	avgCost: "100",
	updatedAt: "2026-07-24",
	nextExpiry: null,
	batches: [],
	movements: [],
};

describe("InventoryDetail adjustment refresh", () => {
	beforeEach(() => {
		routerPush.mockReset();
		mockedDetail.mockReset().mockResolvedValue(detail);
		mockedHistory
			.mockReset()
			.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 });
	});

	it("refetches inventory and adjustment history before navigation callback", async () => {
		render(<InventoryDetail productId="p1" />);
		await screen.findByText("Phân bón");
		fireEvent.click(screen.getByRole("button", { name: "Điều chỉnh tồn" }));
		fireEvent.click(screen.getByRole("button", { name: "Mock complete" }));
		await waitFor(() => expect(mockedDetail).toHaveBeenCalledTimes(2));
		expect(mockedHistory).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
		expect(routerPush).toHaveBeenCalledWith("/ton-kho/p1?adjustment=a1");
	});

	it("keeps refresh errors visible and does not navigate", async () => {
		mockedHistory.mockRejectedValueOnce(new Error("Lịch sử chưa sẵn sàng"));
		render(<InventoryDetail productId="p1" />);
		await screen.findByText("Phân bón");
		fireEvent.click(screen.getByRole("button", { name: "Điều chỉnh tồn" }));
		fireEvent.click(screen.getByRole("button", { name: "Mock complete" }));
		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Lịch sử chưa sẵn sàng",
		);
		expect(routerPush).not.toHaveBeenCalled();
	});
});
