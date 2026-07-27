import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type Customer,
	createCustomer,
	getCustomer,
	listCustomers,
} from "@/lib/tenant-customers-api";
import { CustomerPicker } from "../customer-picker";

vi.mock("@/lib/tenant-customers-api", () => ({
	listCustomers: vi.fn(),
	createCustomer: vi.fn(),
	getCustomer: vi.fn(),
	customerTypeLabel: {
		RETAIL: "Khách lẻ",
		FARMER: "Nông hộ",
		FARM: "Trang trại",
		AGENT: "Đại lý",
	},
}));
vi.mock("@/lib/use-scroll-lock", () => ({ useScrollLock: vi.fn() }));

const customers: Customer[] = [
	{
		id: "c1",
		code: null,
		name: "Anh Ba",
		phone: "0909",
		address: null,
		note: null,
		type: "FARMER",
		balance: 120000,
		openingBalance: 0,
		createdAt: "",
		updatedAt: "",
	},
];

describe("CustomerPicker", () => {
	beforeEach(() => {
		vi.mocked(createCustomer).mockReset().mockResolvedValue(customers[0]);
		vi.mocked(listCustomers)
			.mockReset()
			.mockResolvedValue({ items: customers, page: 1, pageSize: 20, total: 1 });
		vi.mocked(getCustomer).mockReset().mockResolvedValue(customers[0]);
	});

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

	it("creates a new customer from the inline search flow", async () => {
		const onChange = vi.fn();
		vi.mocked(listCustomers).mockResolvedValue({
			items: [],
			page: 1,
			pageSize: 20,
			total: 0,
		});
		render(<CustomerPicker onChange={onChange} />);
		fireEvent.change(
			screen.getByRole("combobox", { name: "Tìm khách hàng ngay trong form" }),
			{ target: { value: "Nguyễn An" } },
		);
		await waitFor(() =>
			expect(
				screen.getByText("Không trùng khách hiện có · Tạo khách mới"),
			).toBeInTheDocument(),
		);
		fireEvent.click(
			screen.getByText("Không trùng khách hiện có · Tạo khách mới"),
		);
		await waitFor(() =>
			expect(createCustomer).toHaveBeenCalledWith({ name: "Nguyễn An" }),
		);
		expect(onChange).toHaveBeenCalledWith("c1");
	});

	it("guards customer creation while the request is pending", async () => {
		let resolveCreate!: (customer: Customer) => void;
		vi.mocked(listCustomers).mockResolvedValue({
			items: [],
			page: 1,
			pageSize: 20,
			total: 0,
		});
		vi.mocked(createCustomer).mockReturnValueOnce(
			new Promise((resolve) => {
				resolveCreate = resolve;
			}),
		);
		render(<CustomerPicker onChange={vi.fn()} />);
		fireEvent.change(
			screen.getByRole("combobox", { name: "Tìm khách hàng ngay trong form" }),
			{ target: { value: "Nguyễn An" } },
		);
		const createButton = await screen.findByRole("button", {
			name: "Không trùng khách hiện có · Tạo khách mới",
		});
		fireEvent.click(createButton);
		expect(createButton).toBeDisabled();
		expect(await screen.findByText("Đang tạo khách...")).toBeInTheDocument();
		fireEvent.click(createButton);
		expect(createCustomer).toHaveBeenCalledTimes(1);
		resolveCreate(customers[0]);
	});

	it("does not offer create when a matching customer exists", async () => {
		render(<CustomerPicker onChange={vi.fn()} />);
		fireEvent.change(
			screen.getByRole("combobox", { name: "Tìm khách hàng ngay trong form" }),
			{ target: { value: "Anh" } },
		);
		await screen.findByText("Anh Ba");
		expect(
			screen.queryByText("Không trùng khách hiện có · Tạo khách mới"),
		).not.toBeInTheDocument();
	});

	it("supports escape and retry on errors", async () => {
		vi.mocked(listCustomers).mockRejectedValueOnce(new Error("offline"));
		render(<CustomerPicker onChange={vi.fn()} />);
		fireEvent.click(screen.getByRole("button", { name: /Khách lẻ/ }));
		expect(await screen.findByRole("alert")).toBeInTheDocument();
		vi.mocked(listCustomers).mockResolvedValueOnce({
			items: customers,
			page: 1,
			pageSize: 20,
			total: 1,
		});
		fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
		expect(await screen.findByText("Anh Ba")).toBeInTheDocument();
		fireEvent.keyDown(window, { key: "Escape" });
		await waitFor(() =>
			expect(screen.getByRole("button", { name: /Khách lẻ/ })).toHaveFocus(),
		);
		expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
	});

	it("debounces intermediate queries", async () => {
		vi.useFakeTimers();
		render(<CustomerPicker onChange={vi.fn()} />);
		fireEvent.click(screen.getByRole("button", { name: /Khách lẻ/ }));
		await act(async () => {
			await vi.runOnlyPendingTimersAsync();
		});
		vi.mocked(listCustomers).mockClear();
		const input = screen.getByRole("combobox", { name: "Tìm khách hàng" });
		fireEvent.change(input, { target: { value: "A" } });
		fireEvent.change(input, { target: { value: "An" } });
		await act(async () => {
			vi.advanceTimersByTime(349);
		});
		expect(listCustomers).not.toHaveBeenCalled();
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1);
		});
		expect(listCustomers).toHaveBeenCalledWith({
			search: "An",
			page: 1,
			pageSize: 20,
		});
		vi.useRealTimers();
	});

	it("keeps the latest result when responses resolve out of order", async () => {
		const pending: Array<
			(value: {
				items: typeof customers;
				page: number;
				pageSize: number;
				total: number;
			}) => void
		> = [];
		vi.mocked(listCustomers).mockImplementation(
			() => new Promise((resolve) => pending.push(resolve)),
		);
		render(<CustomerPicker onChange={vi.fn()} />);
		fireEvent.click(screen.getByRole("button", { name: /Khách lẻ/ }));
		await waitFor(() => expect(pending).toHaveLength(1));
		const input = screen.getByRole("combobox", { name: "Tìm khách hàng" });
		fireEvent.change(input, { target: { value: "old" } });
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 360));
		});
		await waitFor(() => expect(pending).toHaveLength(2));
		const latest = { ...customers[0], id: "latest", name: "Mới nhất" };
		pending[1]({ items: [latest], page: 1, pageSize: 20, total: 1 });
		pending[0]({ items: customers, page: 1, pageSize: 20, total: 1 });
		expect(await screen.findByText("Mới nhất")).toBeInTheDocument();
		expect(screen.queryByText("Anh Ba")).not.toBeInTheDocument();
	});

	it("does not update after unmount with pending request", async () => {
		let resolveRequest!: (value: {
			items: typeof customers;
			page: number;
			pageSize: number;
			total: number;
		}) => void;
		vi.mocked(listCustomers).mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveRequest = resolve;
				}),
		);
		const { unmount } = render(<CustomerPicker onChange={vi.fn()} />);
		fireEvent.click(screen.getByRole("button", { name: /Khách lẻ/ }));
		await waitFor(() => expect(listCustomers).toHaveBeenCalled());
		unmount();
		resolveRequest({ items: customers, page: 1, pageSize: 20, total: 1 });
		await act(async () => {
			await Promise.resolve();
		});
	});

	it("renders empty results", async () => {
		vi.mocked(listCustomers).mockResolvedValueOnce({
			items: [],
			page: 1,
			pageSize: 20,
			total: 0,
		});
		render(<CustomerPicker onChange={vi.fn()} />);
		fireEvent.click(screen.getByRole("button", { name: /Khách lẻ/ }));
		expect(
			await screen.findByText("Không tìm thấy khách hàng"),
		).toBeInTheDocument();
		expect(screen.getByRole("listbox")).toBeInTheDocument();
	});

	it("hides and removes outer input from focus order while sheet is open", async () => {
		render(<CustomerPicker onChange={vi.fn()} />);
		const outer = screen.getByRole("combobox", {
			name: "Tìm khách hàng ngay trong form",
		});
		fireEvent.click(screen.getByRole("button", { name: /Khách lẻ/ }));
		expect(outer).toBeDisabled();
		expect(outer).toHaveAttribute("tabindex", "-1");
		expect(outer).toHaveAttribute("aria-hidden", "true");
		fireEvent.keyDown(window, { key: "Escape" });
		await waitFor(() =>
			expect(screen.getByRole("button", { name: /Khách lẻ/ })).toHaveFocus(),
		);
		expect(outer).not.toBeDisabled();
		expect(outer).toHaveAttribute("tabindex", "0");
	});

	it("exposes combobox active option semantics and selects the first result with Enter", async () => {
		const onChange = vi.fn();
		render(<CustomerPicker onChange={onChange} />);
		fireEvent.click(screen.getByRole("button", { name: /Khách lẻ/ }));
		const input = await screen.findByRole("combobox", {
			name: "Tìm khách hàng",
		});
		const option = await screen.findByRole("option", { name: /Anh Ba/ });
		expect(input).toHaveAttribute("aria-expanded", "true");
		expect(input).toHaveAttribute("aria-controls", "customer-picker-options");
		expect(input).toHaveAttribute(
			"aria-activedescendant",
			"customer-option-c1",
		);
		expect(option).toHaveAttribute("id", "customer-option-c1");
		expect(option).toHaveAttribute("aria-selected", "false");
		fireEvent.keyDown(input, { key: "Enter" });
		expect(onChange).toHaveBeenCalledWith("c1");
	});

	it("supports arrow navigation and Enter selection", async () => {
		const onChange = vi.fn();
		render(<CustomerPicker onChange={onChange} />);
		fireEvent.click(screen.getByRole("button", { name: /Khách lẻ/ }));
		expect(await screen.findByText("Anh Ba")).toBeInTheDocument();
		const input = screen.getByRole("combobox", { name: "Tìm khách hàng" });
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
		expect(
			await screen.findByRole("button", { name: /Anh Ba/ }),
		).toBeInTheDocument();
		const trigger = screen.getByRole("button", { name: /Anh Ba/ });
		fireEvent.click(trigger);
		expect(screen.getByRole("dialog")).toHaveAttribute("aria-modal", "true");
		expect(
			screen.getByRole("combobox", { name: "Tìm khách hàng" }),
		).toHaveFocus();
		fireEvent.keyDown(window, { key: "Escape" });
		await waitFor(() => expect(trigger).toHaveFocus());
	});

	afterEach(() => {
		vi.useRealTimers();
	});
});
