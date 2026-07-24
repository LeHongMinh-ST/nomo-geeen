import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	completeTenantStockAdjustment,
	createTenantStockAdjustment,
} from "@/lib/tenant-stock-adjustments-api";
import { AdjustSheet } from "./adjust-sheet";

vi.mock("@/lib/tenant-stock-adjustments-api", () => ({
	createTenantStockAdjustment: vi.fn(),
	completeTenantStockAdjustment: vi.fn(),
}));
vi.mock("@/lib/use-scroll-lock", () => ({ useScrollLock: vi.fn() }));
const mockedCreate = vi.mocked(createTenantStockAdjustment);
const product = {
	id: "p1",
	name: "Phân bón",
	sku: "P1",
	categoryId: "c1",
	baseUnit: "bao",
	conversions: [],
	costPrice: 10,
	salePrice: 20,
	priceTiers: [],
	stock: 10,
	lowStockThreshold: 1,
};

describe("AdjustSheet", () => {
	beforeEach(() => {
		mockedCreate.mockReset();
		vi.mocked(completeTenantStockAdjustment).mockReset();
	});

	it("blocks submission without a warehouse context", () => {
		render(<AdjustSheet product={product} onClose={vi.fn()} />);
		expect(screen.getByRole("alert")).toHaveTextContent("Chưa có kho mặc định");
		expect(screen.getByRole("button", { name: "Lưu nháp" })).toBeDisabled();
	});

	it("validates reason and submits a decimal delta to create draft", async () => {
		mockedCreate.mockResolvedValue({
			id: "a1",
			docNo: "ADJ-1",
			warehouseId: "w1",
			status: "DRAFT",
			note: null,
			createdBy: null,
			createdAt: "2026-07-24",
			lines: [],
		});
		render(
			<AdjustSheet product={product} warehouseId="w1" onClose={vi.fn()} />,
		);
		fireEvent.change(screen.getByLabelText("Số lượng thực tế"), {
			target: { value: "9.5" },
		});
		fireEvent.change(screen.getByLabelText("Lý do điều chỉnh"), {
			target: { value: "LOSS" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
		await waitFor(() =>
			expect(mockedCreate).toHaveBeenCalledWith(
				expect.objectContaining({
					warehouseId: "w1",
					lines: [{ productId: "p1", delta: "-0.5", reasonCode: "LOSS" }],
				}),
			),
		);
	});

	it("blocks a batch value outside the provided batch catalog", () => {
		const view = render(
			<AdjustSheet
				product={product}
				warehouseId="w1"
				batches={[{ id: "batch-1", batchCode: "LOT-01" }]}
				onClose={vi.fn()}
			/>,
		);
		fireEvent.change(screen.getByLabelText("Số lượng thực tế"), {
			target: { value: "9.5" },
		});
		fireEvent.change(screen.getByLabelText("Lý do điều chỉnh"), {
			target: { value: "LOSS" },
		});
		fireEvent.change(screen.getByLabelText("Lô hàng"), {
			target: { value: "batch-1" },
		});
		view.rerender(
			<AdjustSheet
				product={product}
				warehouseId="w1"
				batches={[]}
				onClose={vi.fn()}
			/>,
		);
		expect(screen.getByRole("button", { name: "Lưu nháp" })).toBeDisabled();
	});

	it("shows the draft, completes it, and restores focus after Escape", async () => {
		const onClose = vi.fn();
		const onSaved = vi.fn();
		mockedCreate.mockResolvedValue({
			id: "a1",
			docNo: "ADJ-1",
			warehouseId: "w1",
			status: "DRAFT",
			note: null,
			createdBy: null,
			createdAt: "2026-07-24",
			lines: [],
		});
		vi.mocked(completeTenantStockAdjustment).mockResolvedValue({
			id: "a1",
			docNo: "ADJ-1",
			warehouseId: "w1",
			status: "COMPLETED",
			note: null,
			createdBy: null,
			createdAt: "2026-07-24",
			lines: [],
		});
		render(
			<AdjustSheet
				product={product}
				warehouseId="w1"
				onClose={onClose}
				onSaved={onSaved}
			/>,
		);
		fireEvent.change(screen.getByLabelText("Số lượng thực tế"), {
			target: { value: "9.5" },
		});
		fireEvent.change(screen.getByLabelText("Lý do điều chỉnh"), {
			target: { value: "LOSS" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
		expect(await screen.findByText("ADJ-1")).toBeInTheDocument();
		expect(document.activeElement).toBe(
			screen.getByRole("button", { name: "Hoàn tất phiếu" }),
		);
		fireEvent.keyDown(document, { key: "Escape" });
		expect(screen.queryByText("ADJ-1")).not.toBeInTheDocument();
		expect(onClose).not.toHaveBeenCalled();
	});

	it("keeps completion context and surfaces structured completion errors", async () => {
		mockedCreate.mockResolvedValue({
			id: "a1",
			docNo: "ADJ-1",
			warehouseId: "w1",
			status: "DRAFT",
			note: null,
			createdBy: null,
			createdAt: "2026-07-24",
			lines: [],
		});
		vi.mocked(completeTenantStockAdjustment).mockRejectedValue({
			reason: "ALREADY_COMPLETED",
			serverMessage: "Phiếu đã được hoàn tất",
		});
		render(
			<AdjustSheet product={product} warehouseId="w1" onClose={vi.fn()} />,
		);
		fireEvent.change(screen.getByLabelText("Số lượng thực tế"), {
			target: { value: "9.5" },
		});
		fireEvent.change(screen.getByLabelText("Lý do điều chỉnh"), {
			target: { value: "LOSS" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));
		fireEvent.click(
			await screen.findByRole("button", { name: "Hoàn tất phiếu" }),
		);
		const alerts = await screen.findAllByRole("alert");
		expect(
			alerts.some((alert) =>
				alert.textContent?.includes(
					"Phiếu đã được hoàn tất (ALREADY_COMPLETED)",
				),
			),
		).toBe(true);
		expect(screen.getByText("ADJ-1")).toBeInTheDocument();
	});
});
