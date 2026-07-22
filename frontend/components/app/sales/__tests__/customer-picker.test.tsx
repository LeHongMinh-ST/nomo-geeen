import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerPicker } from "../customer-picker";
import { getCustomer, listCustomers, type Customer } from "@/lib/tenant-customers-api";

vi.mock("@/lib/tenant-customers-api", () => ({
	listCustomers: vi.fn(),
	getCustomer: vi.fn(),
	customerTypeLabel: { RETAIL: "Khách lẻ", FARMER: "Nông hộ", FARM: "Trang trại", AGENT: "Đại lý" },
}));
vi.mock("@/lib/use-scroll-lock", () => ({ useScrollLock: vi.fn() }));

const customers: Customer[] = [{ id: "c1", code: null, name: "Anh Ba", phone: "0909", address: null, note: null, type: "FARMER", balance: 120000, openingBalance: 0, createdAt: "", updatedAt: "" }];

describe("CustomerPicker", () => {
	beforeEach(() => { vi.mocked(listCustomers).mockReset().mockResolvedValue({ items: customers, page: 1, pageSize: 20, total: 1 }); vi.mocked(getCustomer).mockReset().mockResolvedValue(customers[0]); });

	it("loads customers, selects and clears walk-in", async () => {
		const onChange = vi.fn();
		render(<CustomerPicker onChange={onChange} />);
		fireEvent.click(screen.getByRole("button", { name: /Khách lẻ/ }));
		expect(await screen.findByText("Anh Ba")).toBeInTheDocument();
		fireEvent.click(screen.getByRole("option", { name: /Anh Ba/ }));
		expect(onChange).toHaveBeenCalledWith("c1");
		fireEvent.click(screen.getByRole("button", { name: /Anh Ba/ }));
		fireEvent.click(screen.getByRole("option", { name: /Khách lẻ/ }));
		expect(onChange).toHaveBeenLastCalledWith(undefined);
	});

	it("supports escape and retry on errors", async () => {
		vi.mocked(listCustomers).mockRejectedValueOnce(new Error("offline"));
		render(<CustomerPicker onChange={vi.fn()} />);
		fireEvent.click(screen.getByRole("button", { name: /Khách lẻ/ }));
		expect(await screen.findByRole("alert")).toBeInTheDocument();
		vi.mocked(listCustomers).mockResolvedValueOnce({ items: customers, page: 1, pageSize: 20, total: 1 });
		fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
		expect(await screen.findByText("Anh Ba")).toBeInTheDocument();
		fireEvent.keyDown(window, { key: "Escape" });
		await waitFor(() => expect(screen.getByRole("button", { name: /Khách lẻ/ })).toHaveFocus());
	});

	it("debounces intermediate queries", async () => {
		vi.useFakeTimers();
		render(<CustomerPicker onChange={vi.fn()} />);
		fireEvent.click(screen.getByRole("button", { name: /Khách lẻ/ }));
		await act(async () => { await vi.runOnlyPendingTimersAsync(); });
		vi.mocked(listCustomers).mockClear();
		const input = screen.getByRole("searchbox");
		fireEvent.change(input, { target: { value: "A" } });
		fireEvent.change(input, { target: { value: "An" } });
		await act(async () => { vi.advanceTimersByTime(349); });
		expect(listCustomers).not.toHaveBeenCalled();
		await act(async () => { await vi.advanceTimersByTimeAsync(1); });
		expect(listCustomers).toHaveBeenCalledWith({ search: "An", page: 1, pageSize: 20 });
		vi.useRealTimers();
	});

	it("keeps the latest result when responses resolve out of order", async () => {
		const pending: Array<(value: { items: typeof customers; page: number; pageSize: number; total: number }) => void> = [];
		vi.mocked(listCustomers).mockImplementation(() => new Promise((resolve) => pending.push(resolve)));
		render(<CustomerPicker onChange={vi.fn()} />);
		fireEvent.click(screen.getByRole("button", { name: /Khách lẻ/ }));
		await waitFor(() => expect(pending).toHaveLength(1));
		const input = screen.getByRole("searchbox");
		fireEvent.change(input, { target: { value: "old" } });
		await act(async () => { await new Promise((resolve) => setTimeout(resolve, 360)); });
		await waitFor(() => expect(pending).toHaveLength(2));
		const latest = { ...customers[0], id: "latest", name: "Mới nhất" };
		pending[1]({ items: [latest], page: 1, pageSize: 20, total: 1 });
		pending[0]({ items: customers, page: 1, pageSize: 20, total: 1 });
		expect(await screen.findByText("Mới nhất")).toBeInTheDocument();
		expect(screen.queryByText("Anh Ba")).not.toBeInTheDocument();
	});

	it("does not update after unmount with pending request", async () => {
		let resolveRequest!: (value: { items: typeof customers; page: number; pageSize: number; total: number }) => void;
		vi.mocked(listCustomers).mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve; }));
		const { unmount } = render(<CustomerPicker onChange={vi.fn()} />);
		fireEvent.click(screen.getByRole("button", { name: /Khách lẻ/ }));
		await waitFor(() => expect(listCustomers).toHaveBeenCalled());
		unmount();
		resolveRequest({ items: customers, page: 1, pageSize: 20, total: 1 });
		await act(async () => { await Promise.resolve(); });
	});

	it("renders empty results", async () => {
		vi.mocked(listCustomers).mockResolvedValueOnce({ items: [], page: 1, pageSize: 20, total: 0 });
		render(<CustomerPicker onChange={vi.fn()} />);
		fireEvent.click(screen.getByRole("button", { name: /Khách lẻ/ }));
		expect(await screen.findByText("Không tìm thấy khách hàng")).toBeInTheDocument();
		expect(screen.getByRole("listbox")).toBeInTheDocument();
	});

	it("supports arrow navigation and Enter selection", async () => {
		const onChange = vi.fn();
		render(<CustomerPicker onChange={onChange} />);
		fireEvent.click(screen.getByRole("button", { name: /Khách lẻ/ }));
		expect(await screen.findByText("Anh Ba")).toBeInTheDocument();
		const input = screen.getByRole("searchbox");
		fireEvent.keyDown(input, { key: "ArrowDown" });
		fireEvent.keyDown(input, { key: "ArrowDown" });
		fireEvent.keyDown(input, { key: "ArrowUp" });
		fireEvent.keyDown(input, { key: "ArrowDown" });
		fireEvent.keyDown(input, { key: "Enter" });
		expect(onChange).toHaveBeenCalledWith("c1");
	});

	it("hydrates controlled selected value and restores focus", async () => {
		const onChange = vi.fn();
		render(<CustomerPicker value="c1" onChange={onChange} />);
		expect(await screen.findByRole("button", { name: /Anh Ba/ })).toBeInTheDocument();
		const trigger = screen.getByRole("button", { name: /Anh Ba/ });
		fireEvent.click(trigger);
		expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
		expect(screen.getByRole("searchbox")).toHaveFocus();
		fireEvent.keyDown(window, { key: "Escape" });
		await waitFor(() => expect(trigger).toHaveFocus());
	});

	afterEach(() => { vi.useRealTimers(); });
});
