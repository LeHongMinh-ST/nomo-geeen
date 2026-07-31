import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SalesOrderDetail } from "@/lib/tenant-sales-api";
import {
	buildInvoiceHtml,
	downloadOrderInvoice,
	downloadOrderInvoices,
	OrderInvoiceActions,
	OrderInvoicePrint,
} from "../order-invoice";

const save = vi.fn();
const addPage = vi.fn();

vi.mock("jspdf", () => ({
	jsPDF: class {
		addFileToVFS = vi.fn();
		addFont = vi.fn();
		setFont = vi.fn();
		setTextColor = vi.fn();
		setFontSize = vi.fn();
		text = vi.fn();
		line = vi.fn();
		setLineDashPattern = vi.fn();
		rect = vi.fn();
		splitTextToSize = vi.fn((value: string) => [value]);
		addPage = addPage;
		save = save;
	},
}));

const order: SalesOrderDetail = {
	id: "o1",
	docNo: "SO-001",
	channel: "ORDER",
	status: "COMPLETED",
	customer: {
		id: "c1",
		name: "Chị Mận <test>",
		phone: "0900000000",
		address: "Ấp <Bình Thành>",
	},
	warehouseId: "w1",
	subtotal: 125000,
	discountAmount: 5000,
	total: 120000,
	amountPaid: 100000,
	changeAmount: 0,
	debtAmount: 20000,
	paymentMethod: "CASH",
	note: "Giao buổi chiều",
	soldAt: "2026-07-22T10:10:00.000Z",
	completedAt: "2026-07-22T10:10:00.000Z",
	createdAt: "2026-07-22T10:10:00.000Z",
	updatedAt: "2026-07-22T10:10:00.000Z",
	lines: [
		{
			id: "l1",
			productId: "p1",
			productName: "Bún chả",
			unitId: "u1",
			unitName: "gói",
			qty: "2",
			qtyBase: "2",
			unitPrice: 60000,
			lineTotal: 120000,
		},
	],
};

describe("OrderInvoice", () => {
	beforeEach(() => {
		save.mockClear();
		addPage.mockClear();
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
			}),
		);
	});

	it("builds a receipt artifact from canonical order data and escapes user text", () => {
		const html = buildInvoiceHtml(order);
		expect(html).toContain("HÓA ĐƠN THANH TOÁN");
		expect(html).toContain("SO-001");
		expect(html).toContain("Chị Mận &lt;test&gt;");
		expect(html).toContain("Ấp &lt;Bình Thành&gt;");
		expect(html).toContain("Giao buổi chiều");
		expect(html).toContain("80mm");
	});

	it("downloads a real PDF file with the order number", async () => {
		await downloadOrderInvoice(order);
		expect(save).toHaveBeenCalledWith("hoa-don-SO-001.pdf");
	});

	it("merges selected orders into one multi-page PDF", async () => {
		await downloadOrderInvoices([
			order,
			{ ...order, id: "o2", docNo: "SO-002" },
			{ ...order, id: "o3", docNo: "SO-003" },
		]);
		expect(addPage).toHaveBeenCalledTimes(2);
		expect(save).toHaveBeenCalledWith("hoa-don-3-don.pdf");
	});

	it("skips the download when nothing is selected", async () => {
		await downloadOrderInvoices([]);
		expect(save).not.toHaveBeenCalled();
	});

	it("renders both accessible invoice actions and the print-only receipt", () => {
		const { container } = render(
			<>
				<OrderInvoiceActions order={order} />
				<OrderInvoicePrint order={order} />
			</>,
		);
		expect(
			screen.getByRole("button", { name: "Tải PDF hóa đơn" }),
		).toBeInTheDocument();
		expect(
			screen.getByRole("button", { name: "In hóa đơn" }),
		).toBeInTheDocument();
		const frame = container.querySelector(".order-invoice-print");
		expect(frame).toHaveAttribute("title", "Hóa đơn SO-001");
		expect(frame).toHaveAttribute("srcdoc");
	});
});
