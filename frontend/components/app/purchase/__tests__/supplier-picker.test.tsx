import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createTenantSupplier,
	getTenantSupplier,
	listTenantSuppliers,
	type TenantSupplier,
} from "@/lib/tenant-suppliers-api";
import { SupplierPicker } from "../supplier-picker";

vi.mock("@/lib/tenant-suppliers-api", () => ({
	listTenantSuppliers: vi.fn(),
	createTenantSupplier: vi.fn(),
	getTenantSupplier: vi.fn(),
	supplierTypeLabel: (value: string | null) => value ?? "Chưa phân loại",
}));
vi.mock("@/lib/use-scroll-lock", () => ({ useScrollLock: vi.fn() }));

const existing: TenantSupplier = {
	id: "sup-1",
	code: "NCC-01",
	name: "Vật tư Bình Điền",
	supplierType: "BOTH",
	contactName: null,
	phone: "0909111222",
	email: null,
	address: null,
	province: null,
	taxCode: null,
	balance: 0,
	status: "ACTIVE",
};

describe("SupplierPicker", () => {
	beforeEach(() => {
		vi.mocked(listTenantSuppliers)
			.mockReset()
			.mockResolvedValue({
				items: [existing],
				page: 1,
				pageSize: 20,
				total: 1,
			});
		vi.mocked(createTenantSupplier).mockReset();
		vi.mocked(getTenantSupplier).mockReset();
	});

	it("lists suppliers and selects an existing one", async () => {
		const onChange = vi.fn();
		render(<SupplierPicker onChange={onChange} />);
		fireEvent.click(screen.getByRole("button", { name: /Chọn nhà cung cấp/ }));
		expect(await screen.findByText("Vật tư Bình Điền")).toBeInTheDocument();
		fireEvent.click(screen.getByText("Vật tư Bình Điền"));
		expect(onChange).toHaveBeenCalledWith("sup-1");
		expect(createTenantSupplier).not.toHaveBeenCalled();
	});

	it("shows the selected supplier after the parent value changes", async () => {
		const onChange = vi.fn();
		vi.mocked(getTenantSupplier).mockResolvedValue(existing);
		const { rerender } = render(<SupplierPicker onChange={onChange} />);
		rerender(<SupplierPicker value="sup-1" onChange={onChange} />);
		expect(
			await screen.findByRole("button", { name: /Vật tư Bình Điền/ }),
		).toBeInTheDocument();
	});

	it("creates a new supplier through the inline form", async () => {
		const onChange = vi.fn();
		vi.mocked(listTenantSuppliers).mockResolvedValue({
			items: [],
			page: 1,
			pageSize: 20,
			total: 0,
		});
		vi.mocked(createTenantSupplier).mockResolvedValue({
			...existing,
			id: "sup-new",
			code: "NCC-001",
			name: "NCC Mới",
			phone: "0912345678",
		});

		render(<SupplierPicker onChange={onChange} />);
		fireEvent.click(screen.getByRole("button", { name: /Chọn nhà cung cấp/ }));
		fireEvent.click(
			await screen.findByRole("button", { name: /\+ Thêm nhà cung cấp mới/ }),
		);
		fireEvent.change(screen.getByLabelText("Tên nhà cung cấp"), {
			target: { value: "NCC Mới" },
		});
		fireEvent.change(screen.getByLabelText("Số điện thoại NCC"), {
			target: { value: "0912345678" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Lưu nhà cung cấp" }));

		await waitFor(() => {
			expect(createTenantSupplier).toHaveBeenCalledWith({
				name: "NCC Mới",
				phone: "0912345678",
			});
			expect(onChange).toHaveBeenCalledWith("sup-new");
		});
	});

	it("reuses an existing supplier when name or phone already matches", async () => {
		const onChange = vi.fn();
		render(<SupplierPicker onChange={onChange} />);
		fireEvent.click(screen.getByRole("button", { name: /Chọn nhà cung cấp/ }));
		fireEvent.click(
			await screen.findByRole("button", { name: /\+ Thêm nhà cung cấp mới/ }),
		);
		fireEvent.change(screen.getByLabelText("Tên nhà cung cấp"), {
			target: { value: "Vật tư Bình Điền" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Lưu nhà cung cấp" }));

		await waitFor(() => {
			expect(onChange).toHaveBeenCalledWith("sup-1");
		});
		expect(createTenantSupplier).not.toHaveBeenCalled();
	});
});
