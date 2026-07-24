import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listTenantStockAdjustments } from "@/lib/tenant-stock-adjustments-api";
import { AdjustmentList } from "./adjustment-list";

vi.mock("@/lib/tenant-stock-adjustments-api", () => ({
	listTenantStockAdjustments: vi.fn(),
}));
vi.mock("next/link", () => ({
	default: ({
		children,
		href,
	}: {
		children: React.ReactNode;
		href: string;
	}) => <a href={href}>{children}</a>,
}));

const mockedList = vi.mocked(listTenantStockAdjustments);

describe("AdjustmentList", () => {
	beforeEach(() => mockedList.mockReset());

	it("renders canonical rows and completed status", async () => {
		mockedList.mockResolvedValue({
			items: [
				{
					id: "a1",
					docNo: "ADJ-001",
					warehouseId: "w1",
					status: "COMPLETED",
					note: null,
					createdBy: null,
					createdAt: "2026-07-24T00:00:00Z",
					lines: [
						{
							id: "l1",
							productId: "p1",
							batchId: null,
							qtyBefore: "10",
							qtyAfter: "9",
							delta: "-1",
							reasonCode: "LOSS",
						},
					],
				},
			],
			page: 1,
			pageSize: 20,
			total: 1,
		});
		render(<AdjustmentList />);
		expect(await screen.findByText("ADJ-001")).toBeInTheDocument();
		expect(screen.getByRole("status")).toHaveTextContent("Đã hoàn tất");
		expect(screen.getByText("1 dòng · Kho w1")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /ADJ-001/ })).toHaveAttribute(
			"href",
			"/ton-kho/p1?adjustment=a1",
		);
	});

	it("renders an empty state", async () => {
		mockedList.mockResolvedValue({
			items: [],
			page: 1,
			pageSize: 20,
			total: 0,
		});
		render(<AdjustmentList />);
		expect(
			await screen.findByText("Chưa có phiếu điều chỉnh."),
		).toBeInTheDocument();
	});
});
