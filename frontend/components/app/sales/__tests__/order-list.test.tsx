import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getOrder,
	listOrders,
	type SalesOrderSummary,
} from "@/lib/tenant-sales-api";
import { downloadOrderInvoices } from "../order-invoice";
import { OrderList } from "../order-list";

vi.mock("@/lib/tenant-sales-api", () => ({
	listOrders: vi.fn(),
	getOrder: vi.fn(),
}));
vi.mock("../order-invoice", () => ({ downloadOrderInvoices: vi.fn() }));
vi.mock("next/link", () => ({
	default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));
const item = (id: string, docNo = `SO-${id}`): SalesOrderSummary => ({
	id,
	docNo,
	status: "COMPLETED",
	customerName: "Khách",
	customerPhone: null,
	itemCount: 1,
	total: 120000,
	paymentMethod: "CASH",
	soldAt: "2026-07-22",
	createdAt: "2026-07-22",
});
let observerCallback:
	| ((entries: Array<{ isIntersecting: boolean }>) => void)
	| undefined;
beforeEach(() => {
	vi.useRealTimers();
	vi.mocked(listOrders).mockReset();
	vi.mocked(getOrder).mockReset();
	vi.mocked(downloadOrderInvoices).mockReset();
	vi.mocked(getOrder).mockImplementation(
		async (id: string) => ({ id, docNo: `SO-${id}` }) as never,
	);
	vi.mocked(listOrders).mockResolvedValue({
		items: [item("1")],
		page: 1,
		pageSize: 20,
		total: 1,
	});
	observerCallback = undefined;
	Object.defineProperty(window, "matchMedia", {
		configurable: true,
		writable: true,
		value: (query: string) => ({
			matches: query.includes("max-width") ? false : false,
			media: query,
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
		}),
	});
	vi.stubGlobal(
		"IntersectionObserver",
		class {
			constructor(cb: typeof observerCallback) {
				observerCallback = cb;
			}
			observe() {}
			disconnect() {}
		},
	);
});
describe("OrderList", () => {
	it("renders initial loading then canonical rows", async () => {
		let resolve!: (v: any) => void;
		vi.mocked(listOrders).mockReturnValueOnce(
			new Promise((r) => {
				resolve = r;
			}),
		);
		render(<OrderList />);
		expect(screen.getByText("Đơn bán hàng")).toBeInTheDocument();
		await act(async () =>
			resolve({ items: [item("1")], page: 1, pageSize: 20, total: 1 }),
		);
		expect((await screen.findAllByText("SO-1"))[0]).toBeInTheDocument();
	});
	it("links each order to its detail route", async () => {
		render(<OrderList />);
		const link = await screen.findByRole("link", { name: "Mở chi tiết SO-1" });
		expect(link).toHaveAttribute("href", "/don-ban-hang/1");
	});
	it("shows empty state", async () => {
		vi.mocked(listOrders).mockResolvedValueOnce({
			items: [],
			page: 1,
			pageSize: 20,
			total: 0,
		});
		render(<OrderList />);
		expect(
			await screen.findByText("Không tìm thấy đơn nào"),
		).toBeInTheDocument();
	});
	it.each([403, 404])("shows %s failure and retry", async (status) => {
		vi.mocked(listOrders).mockRejectedValueOnce(
			Object.assign(new Error(), { status }),
		);
		render(<OrderList />);
		expect(await screen.findByRole("alert")).toHaveTextContent(/./);
		vi.mocked(listOrders).mockResolvedValueOnce({
			items: [item("retry")],
			page: 1,
			pageSize: 20,
			total: 1,
		});
		fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
		expect((await screen.findAllByText("SO-retry"))[0]).toBeInTheDocument();
	});
	it("debounces and ignores stale response", async () => {
		let old!: (v: any) => void;
		vi.mocked(listOrders).mockReturnValueOnce(
			new Promise((r) => {
				old = r;
			}),
		);
		render(<OrderList />);
		fireEvent.change(screen.getByRole("searchbox"), {
			target: { value: "new" },
		});
		await waitFor(() => expect(listOrders).toHaveBeenCalledTimes(2), {
			timeout: 1500,
		});
		expect(listOrders).toHaveBeenLastCalledWith(
			expect.objectContaining({ search: "new" }),
		);
		await act(async () =>
			old({ items: [item("old", "STALE")], page: 1, pageSize: 20, total: 1 }),
		);
		expect(screen.queryByText("STALE")).not.toBeInTheDocument();
	});
	it("replaces rows on desktop pagination", async () => {
		vi.mocked(listOrders).mockResolvedValueOnce({
			items: [item("first")],
			page: 1,
			pageSize: 20,
			total: 21,
		});
		vi.mocked(listOrders).mockResolvedValueOnce({
			items: [item("second")],
			page: 2,
			pageSize: 20,
			total: 21,
		});
		render(<OrderList />);
		expect((await screen.findAllByText("SO-first"))[0]).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "2" }));
		expect((await screen.findAllByText("SO-second"))[0]).toBeInTheDocument();
		expect(screen.queryByText("SO-first")).not.toBeInTheDocument();
	});
	it("selects all visible orders and lets the seller clear the selection", async () => {
		vi.mocked(listOrders).mockResolvedValueOnce({
			items: [item("one"), item("two")],
			page: 1,
			pageSize: 20,
			total: 2,
		});
		render(<OrderList />);
		expect(
			await screen.findByRole("checkbox", {
				name: "Chọn tất cả đơn đang hiển thị",
			}),
		).toBeInTheDocument();
		const rows = screen.getAllByRole("checkbox", { name: /Chọn đơn SO-/ });
		expect(rows).toHaveLength(4);
		fireEvent.click(
			screen.getByRole("checkbox", { name: "Chọn tất cả đơn đang hiển thị" }),
		);
		expect(screen.getByText("Bỏ chọn (2)")).toBeInTheDocument();
		expect(
			rows.every((checkbox) => (checkbox as HTMLInputElement).checked),
		).toBe(true);
		fireEvent.click(screen.getByText("Bỏ chọn (2)"));
		expect(screen.queryByText("Bỏ chọn (2)")).not.toBeInTheDocument();
	});
	it("downloads one merged PDF for the selected orders", async () => {
		vi.mocked(listOrders).mockResolvedValueOnce({
			items: [item("one"), item("two")],
			page: 1,
			pageSize: 20,
			total: 2,
		});
		render(<OrderList />);
		const [checkbox] = await screen.findAllByRole("checkbox", {
			name: "Chọn đơn SO-one",
		});
		fireEvent.click(checkbox as HTMLInputElement);
		fireEvent.click(screen.getByRole("button", { name: /Tải hóa đơn \(1\)/ }));
		await waitFor(() =>
			expect(downloadOrderInvoices).toHaveBeenCalledWith([
				expect.objectContaining({ id: "one" }),
			]),
		);
		expect(getOrder).toHaveBeenCalledTimes(1);
	});

	it("surfaces a failure when the bulk download breaks", async () => {
		vi.mocked(listOrders).mockResolvedValueOnce({
			items: [item("one")],
			page: 1,
			pageSize: 20,
			total: 1,
		});
		vi.mocked(getOrder).mockRejectedValueOnce(new Error("Mất kết nối"));
		render(<OrderList />);
		fireEvent.click(
			await screen.findByRole("checkbox", {
				name: "Chọn tất cả đơn đang hiển thị",
			}),
		);
		fireEvent.click(screen.getByRole("button", { name: /Tải hóa đơn \(1\)/ }));
		expect(await screen.findByText("Mất kết nối")).toBeInTheDocument();
		expect(downloadOrderInvoices).not.toHaveBeenCalled();
	});

	it("appends mobile pages with dedupe and terminal state", async () => {
		Object.defineProperty(window, "matchMedia", {
			configurable: true,
			value: () => ({
				matches: true,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
			}),
		});
		vi.stubGlobal(
			"IntersectionObserver",
			class {
				constructor(public cb: any) {}
				observe() {
					setTimeout(() => this.cb([{ isIntersecting: true }]), 0);
				}
				disconnect() {}
			},
		);
		vi.mocked(listOrders).mockResolvedValueOnce({
			items: [item("a"), item("b")],
			page: 1,
			pageSize: 20,
			total: 3,
		});
		vi.mocked(listOrders).mockResolvedValueOnce({
			items: [item("b"), item("c")],
			page: 2,
			pageSize: 20,
			total: 3,
		});
		render(<OrderList />);
		expect((await screen.findAllByText("SO-c"))[0]).toBeInTheDocument();
		expect(screen.getByText("Đã hiển thị tất cả 3 đơn")).toBeInTheDocument();
	});
});
