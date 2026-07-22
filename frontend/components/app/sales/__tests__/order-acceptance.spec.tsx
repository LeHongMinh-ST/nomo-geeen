import { act, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import OrdersPage from "@/app/(app)/don-ban-hang/page";
import CreateOrderPage from "@/app/(app)/don-ban-hang/tao/page";
import OrderDetailPage from "@/app/(app)/don-ban-hang/[id]/page";
import { getOrder, listOrders, type SalesOrderDetail, type SalesOrderSummary } from "@/lib/tenant-sales-api";

vi.mock("next/link", () => ({
	default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
		<a href={href} {...props}>{children}</a>
	),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/app/sales/order-form", () => ({
	OrderForm: () => <main aria-label="Tạo đơn bán hàng"><h1>Tạo đơn bán hàng</h1></main>,
}));
vi.mock("@/lib/tenant-sales-api", async () => {
	const actual = await vi.importActual<typeof import("@/lib/tenant-sales-api")>("@/lib/tenant-sales-api");
	return { ...actual, getOrder: vi.fn(), listOrders: vi.fn() };
});

const order: SalesOrderSummary = {
	id: "order-1",
	docNo: "BH-ACCEPTANCE-1",
	status: "COMPLETED",
	customerName: "Khách acceptance",
	customerPhone: null,
	itemCount: 1,
	total: 500,
	paymentMethod: "CASH",
	soldAt: "2026-07-22",
	createdAt: "2026-07-22",
};

const detail: SalesOrderDetail = {
	id: order.id,
	docNo: order.docNo,
	channel: "ORDER",
	status: order.status,
	customer: null,
	warehouseId: "warehouse-1",
	subtotal: order.total,
	discountAmount: 0,
	total: order.total,
	amountPaid: order.total,
	changeAmount: 0,
	debtAmount: 0,
	paymentMethod: "CASH",
	note: null,
	soldAt: order.soldAt,
	completedAt: order.createdAt,
	createdAt: order.createdAt,
	updatedAt: order.createdAt,
	lines: [{
		id: "line-1",
		productId: "product-1",
		productName: "Phân bón acceptance",
		unitId: "unit-1",
		unitName: "bao",
		qty: "1",
		qtyBase: "1",
		unitPrice: order.total,
		lineTotal: order.total,
	}],
};

function setViewport(width: number) {
	Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		value: (query: string) => ({
			matches: query.includes("max-width") ? width <= 1023 : false,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}),
	});
}

	describe("sales order acceptance reachability", () => {
	beforeEach(() => {
		vi.mocked(listOrders).mockReset();
		vi.mocked(getOrder).mockReset();
		vi.mocked(listOrders).mockResolvedValue({ items: [order], page: 1, pageSize: 20, total: 1 });
		vi.mocked(getOrder).mockResolvedValue(detail);
		vi.stubGlobal("IntersectionObserver", class {
			observe() {}
			disconnect() {}
		});
		setViewport(1280);
	});
	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllGlobals();
	});

	it.each([390, 768, 1280])("reaches the real order list route at %dpx with accessible controls", async (width) => {
		setViewport(width);
		render(<OrdersPage />);
		expect((await screen.findAllByText("BH-ACCEPTANCE-1")).length).toBeGreaterThan(0);
		expect(screen.getByRole("searchbox", { name: "Tìm kiếm đơn hàng" })).toBeInTheDocument();
		expect(screen.getAllByRole("link", { name: /Tạo đơn/ }).every((link) => link.getAttribute("href") === "/don-ban-hang/tao")).toBe(true);
		expect(screen.getAllByRole("combobox", { name: "Trạng thái" }).length).toBeGreaterThan(0);
		expect(screen.getByRole("table")).toBeInTheDocument();
		expect(document.querySelector('[class*="lg:hidden"]')).toBeInTheDocument();
		expect(window.innerWidth).toBe(width);
	});

	it("reaches the real create route and keeps a keyboard-accessible primary heading", () => {
		render(<CreateOrderPage />);
		expect(screen.getByRole("main", { name: "Tạo đơn bán hàng" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "Tạo đơn bán hàng" })).toBeInTheDocument();
	});

	it("reaches the real order detail route", async () => {
		await act(async () => {
			render(
				<Suspense fallback={<p>Đang tải route</p>}>
					<OrderDetailPage params={Promise.resolve({ id: order.id })} />
				</Suspense>,
			);
		});
		expect(await screen.findByText(order.docNo)).toBeInTheDocument();
		expect(screen.getByText("Phân bón acceptance")).toBeInTheDocument();
	});

	it("drives desktop pagination from the real list route", async () => {
		setViewport(1280);
		vi.mocked(listOrders)
			.mockResolvedValueOnce({ items: [order], page: 1, pageSize: 20, total: 21 })
			.mockResolvedValueOnce({ items: [{ ...order, id: "order-2", docNo: "BH-ACCEPTANCE-2" }], page: 2, pageSize: 20, total: 21 });
		render(<OrdersPage />);
		await screen.findAllByText(order.docNo);
		await waitFor(() => expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument());
		screen.getByRole("button", { name: "2" }).click();
		expect((await screen.findAllByText("BH-ACCEPTANCE-2")).length).toBeGreaterThan(0);
		expect(listOrders).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
	});

	it("drives mobile incremental loading through LoadMoreSentinel", async () => {
		setViewport(390);
		vi.stubGlobal("IntersectionObserver", class {
			constructor(private readonly callback: IntersectionObserverCallback) {}
			observe() { this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver); }
			disconnect() {}
		});
		vi.mocked(listOrders)
			.mockResolvedValueOnce({ items: [order], page: 1, pageSize: 20, total: 2 })
			.mockResolvedValueOnce({ items: [{ ...order, id: "order-2", docNo: "BH-ACCEPTANCE-2" }], page: 2, pageSize: 20, total: 2 });
		render(<OrdersPage />);
		expect((await screen.findAllByText("BH-ACCEPTANCE-2")).length).toBeGreaterThan(0);
		expect(listOrders).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
	});

	it("does not use seeded order data or an untyped button in the list route", async () => {
		render(<OrdersPage />);
		expect((await screen.findAllByText("BH-ACCEPTANCE-1")).length).toBeGreaterThan(0);
		expect(screen.queryByText("SO-001")).not.toBeInTheDocument();
		expect(document.querySelectorAll("button:not([type])")).toHaveLength(0);
	});
});
