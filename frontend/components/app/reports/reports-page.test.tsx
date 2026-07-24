import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getTenantSalesSummary,
	getTenantStockSummary,
} from "@/lib/tenant-reports-api";
import { ReportsPage } from "./reports-page";

vi.mock("@/lib/tenant-reports-api", async () => {
	const actual = await vi.importActual<
		typeof import("@/lib/tenant-reports-api")
	>("@/lib/tenant-reports-api");
	return {
		...actual,
		getTenantStockSummary: vi.fn(),
		getTenantSalesSummary: vi.fn(),
	};
});

const mockedStock = vi.mocked(getTenantStockSummary);
const mockedSales = vi.mocked(getTenantSalesSummary);

const emptySales = {
	from: "2026-06-24T00:00:00.000Z",
	to: "2026-07-24T00:00:00.000Z",
	filter: { businessGroup: null },
	orders: 0,
	total: "0",
	amountPaid: "0",
	debtAmount: "0",
	byBusinessGroup: [] as [],
	topProducts: [] as [],
};

describe("ReportsPage", () => {
	beforeEach(() => {
		mockedStock.mockReset();
		mockedSales.mockReset();
	});

	it("renders live stock and sales summaries without mock KPIs", async () => {
		mockedStock.mockResolvedValue({
			filter: { businessGroup: null },
			byBusinessGroup: [
				{
					businessGroup: "CROP_INPUTS",
					label: "Thuốc bảo vệ thực vật + Phân bón",
					itemCount: 1,
					qty: "10",
				},
			],
			items: [
				{
					warehouseId: "wh-1",
					product: {
						id: "p1",
						sku: "SKU-1",
						name: "Phân NPK",
						productKind: "FERTILIZER",
						businessGroup: "CROP_INPUTS",
						baseUnitId: "u1",
					},
					qty: "10",
					avgCost: "50000",
					batches: [],
				},
			],
		});
		mockedSales.mockResolvedValue({
			from: "2026-06-24T00:00:00.000Z",
			to: "2026-07-24T00:00:00.000Z",
			filter: { businessGroup: null },
			orders: 2,
			total: "150000",
			amountPaid: "100000",
			debtAmount: "50000",
			byBusinessGroup: [
				{
					businessGroup: "CROP_INPUTS",
					label: "Thuốc bảo vệ thực vật + Phân bón",
					lineCount: 2,
					qtyBase: "4",
					total: "150000",
				},
			],
			topProducts: [
				{
					productId: "p1",
					name: "Phân NPK",
					qtyBase: "4",
					total: "150000",
				},
			],
		});

		render(<ReportsPage />);
		expect(await screen.findByText("Phân NPK")).toBeInTheDocument();
		expect(screen.getByText("Doanh thu")).toBeInTheDocument();
		expect(screen.getByTestId("stock-by-group")).toHaveTextContent(
			"Thuốc bảo vệ thực vật + Phân bón",
		);
		expect(screen.getByTestId("sales-by-group")).toHaveTextContent(
			"Thuốc bảo vệ thực vật + Phân bón",
		);
		expect(screen.getByTestId("reports-scope-note")).toHaveTextContent(
			"Chưa có biểu đồ",
		);
		expect(mockedStock).toHaveBeenCalled();
		expect(mockedSales).toHaveBeenCalled();
	});

	it("reloads both summaries when business group changes", async () => {
		mockedStock.mockResolvedValue({
			filter: { businessGroup: null },
			byBusinessGroup: [],
			items: [],
		});
		mockedSales.mockResolvedValue(emptySales);
		render(<ReportsPage />);
		await screen.findByText("Chưa có dòng tồn kho để báo cáo.");
		const stockCalls = mockedStock.mock.calls.length;
		const salesCalls = mockedSales.mock.calls.length;

		fireEvent.change(screen.getByLabelText("Nhóm kinh doanh"), {
			target: { value: "LIVESTOCK" },
		});

		await waitFor(() => {
			expect(mockedStock.mock.calls.length).toBeGreaterThan(stockCalls);
			expect(mockedSales.mock.calls.length).toBeGreaterThan(salesCalls);
		});
		expect(mockedStock).toHaveBeenCalledWith({ businessGroup: "LIVESTOCK" });
		expect(mockedSales).toHaveBeenCalledWith(
			expect.objectContaining({ businessGroup: "LIVESTOCK" }),
		);
	});

	it("shows empty states when API returns no data", async () => {
		mockedStock.mockResolvedValue({
			filter: { businessGroup: null },
			byBusinessGroup: [],
			items: [],
		});
		mockedSales.mockResolvedValue(emptySales);

		render(<ReportsPage />);

		expect(
			await screen.findByText("Chưa có dòng tồn kho để báo cáo."),
		).toBeInTheDocument();
		expect(
			screen.getByText("Chưa có đơn bán hoàn tất trong khoảng này."),
		).toBeInTheDocument();
	});

	it("maps stock API reason and never shows raw Error.message; allows retry", async () => {
		const raw = Object.assign(new Error("English Nest leak"), {
			reason: "REPORT_RANGE_TOO_LARGE",
		});
		mockedStock.mockRejectedValueOnce(raw).mockResolvedValueOnce({
			filter: { businessGroup: null },
			byBusinessGroup: [],
			items: [],
		});
		mockedSales.mockResolvedValue(emptySales);

		render(<ReportsPage />);
		expect(
			await screen.findByText(
				"Khoảng thời gian báo cáo quá dài. Vui lòng thu hẹp khoảng ngày.",
			),
		).toBeInTheDocument();
		expect(screen.queryByText("English Nest leak")).not.toBeInTheDocument();

		const retryButtons = screen.getAllByRole("button", { name: "Thử lại" });
		expect(retryButtons[0]).toBeDefined();
		fireEvent.click(retryButtons[0]);
		await waitFor(() => {
			expect(mockedStock).toHaveBeenCalledTimes(2);
		});
	});

	it("uses report stock fallback when error has no reason", async () => {
		mockedStock.mockRejectedValue(new Error("raw server stack"));
		mockedSales.mockResolvedValue(emptySales);

		render(<ReportsPage />);
		expect(
			await screen.findByText("Không thể tải báo cáo tồn kho"),
		).toBeInTheDocument();
		expect(screen.queryByText("raw server stack")).not.toBeInTheDocument();
	});

	it("maps sales API reason without leaking Error.message", async () => {
		mockedStock.mockResolvedValue({
			filter: { businessGroup: null },
			byBusinessGroup: [],
			items: [],
		});
		const raw = Object.assign(new Error("Internal sales dump"), {
			reason: "INVALID_REPORT_RANGE",
		});
		mockedSales.mockRejectedValue(raw);

		render(<ReportsPage />);
		expect(
			await screen.findByText(
				"Khoảng thời gian báo cáo không hợp lệ. Vui lòng chọn lại ngày.",
			),
		).toBeInTheDocument();
		expect(screen.queryByText("Internal sales dump")).not.toBeInTheDocument();
	});

	it("blocks invalid date range without calling sales API again with bad range", async () => {
		mockedStock.mockResolvedValue({
			filter: { businessGroup: null },
			byBusinessGroup: [],
			items: [],
		});
		mockedSales.mockResolvedValue(emptySales);

		render(<ReportsPage />);
		await screen.findByText("Chưa có dòng tồn kho để báo cáo.");
		const callsBefore = mockedSales.mock.calls.length;

		const fromInput = screen.getByLabelText("Từ ngày");
		const toInput = screen.getByLabelText("Đến ngày");
		fireEvent.change(fromInput, { target: { value: "2026-07-20" } });
		fireEvent.change(toInput, { target: { value: "2026-07-10" } });
		fireEvent.click(screen.getByRole("button", { name: "Áp dụng" }));

		expect(
			await screen.findByText(
				"Khoảng thời gian báo cáo không hợp lệ. Vui lòng chọn lại ngày.",
			),
		).toBeInTheDocument();
		expect(mockedSales.mock.calls.length).toBe(callsBefore);
	});
});
