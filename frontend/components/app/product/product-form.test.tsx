import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "@/lib/products";
import { ProductForm } from "./product-form";

const { createTenantProduct, updateTenantProduct } = vi.hoisted(() => ({
	createTenantProduct: vi.fn(),
	updateTenantProduct: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/lib/tenant-products-api", () => ({
	createTenantProduct,
	updateTenantProduct,
	getTenantBusinessGroups: vi
		.fn()
		.mockResolvedValue({ configured: false, groups: [] }),
	getProductLookups: vi.fn(),
}));

const lookups = {
	categories: [{ id: "category", name: "Phân bón" }],
	brands: [],
	manufacturers: [],
	units: [
		{ id: "unit", code: "KG", name: "Kg" },
		{ id: "box", code: "BOX", name: "Bao" },
	],
};

const productFixture: Product = {
	id: "product-1",
	name: "Thuốc test",
	sku: "TEST-01",
	categoryId: "category",
	baseUnit: "Kg",
	baseUnitId: "unit",
	conversions: [],
	costPrice: 10,
	salePrice: 20,
	priceTiers: [],
	stock: 0,
	lowStockThreshold: 0,
};

describe("ProductForm ProductKind flow", () => {
	beforeEach(() => {
		createTenantProduct.mockReset();
		updateTenantProduct.mockReset();
	});

	it("filters kind choices and keeps specialist fields hidden until a kind is selected", async () => {
		render(<ProductForm mode="create" lookups={lookups} />);

		await waitFor(() =>
			expect(
				screen.getByRole("combobox", { name: "Nhóm ngành hàng" }),
			).toBeInTheDocument(),
			);
		const group = screen.getByLabelText("Nhóm ngành hàng");
		expect(screen.queryByLabelText("Hoạt chất")).not.toBeInTheDocument();

		fireEvent.change(group, { target: { value: "CROP_INPUTS" } });
		const kind = screen.getByLabelText("Loại sản phẩm");
		expect(
			within(kind).getByRole("option", { name: "Thuốc bảo vệ thực vật" }),
		).toHaveValue("PESTICIDE");
		expect(
			within(kind).queryByRole("option", { name: "Thuốc thú y" }),
		).not.toBeInTheDocument();

		fireEvent.change(kind, { target: { value: "PESTICIDE" } });
		expect(screen.getByLabelText("Hoạt chất")).toBeInTheDocument();
		expect(screen.getByLabelText("Nồng độ / hàm lượng")).toBeInTheDocument();
	});

	it("auto-selects the only kind and hides the kind selector", () => {
		render(<ProductForm mode="create" lookups={lookups} />);

		fireEvent.change(screen.getByLabelText("Nhóm ngành hàng"), {
			target: { value: "ANIMAL_FEED" },
		});

		expect(screen.queryByLabelText("Loại sản phẩm")).not.toBeInTheDocument();
		expect(screen.getAllByText("Thức ăn chăn nuôi")).toHaveLength(2);
	});

	it("blocks submit when selected kind required attrs are empty", async () => {
		render(<ProductForm mode="create" lookups={lookups} />);
		fireEvent.change(screen.getByLabelText("Nhóm ngành hàng"), {
			target: { value: "CROP_INPUTS" },
		});
		fireEvent.change(screen.getByLabelText("Loại sản phẩm"), {
			target: { value: "PESTICIDE" },
		});
		fireEvent.submit(
			screen
				.getAllByRole("button", { name: "Thêm sản phẩm" })[0]
				.closest("form") as HTMLFormElement,
		);
		await waitFor(() =>
			expect(
				screen.getByText(
					"Vui lòng chọn nhóm, loại sản phẩm và điền đủ thông tin chuyên ngành bắt buộc.",
				),
			).toBeInTheDocument(),
		);
		expect(createTenantProduct).not.toHaveBeenCalled();
	});

	it("submits canonical group, kind, and normalized attrs", async () => {
		createTenantProduct.mockResolvedValue({ id: "created" });
		render(<ProductForm mode="create" lookups={lookups} />);
		fireEvent.change(screen.getByLabelText("Nhóm ngành hàng"), {
			target: { value: "CROP_INPUTS" },
		});
		fireEvent.change(screen.getByLabelText("Loại sản phẩm"), {
			target: { value: "PESTICIDE" },
		});
		fireEvent.change(
			screen.getByPlaceholderText("VD: Phân bón NPK Đầu Trâu 20-20-15"),
			{ target: { value: "Thuốc test" } },
		);
		expect(screen.getByPlaceholderText("Tự sinh khi lưu sản phẩm")).toHaveAttribute(
			"readonly",
		);
		fireEvent.change(screen.getByLabelText("Hoạt chất"), {
			target: { value: " Fipronil " },
		});
		fireEvent.change(screen.getByLabelText("Nồng độ / hàm lượng"), {
			target: { value: "800 g/kg" },
		});
		fireEvent.change(screen.getByLabelText("Thời gian cách ly (ngày)"), {
			target: { value: "7" },
		});
		fireEvent.change(screen.getByLabelText("Thời gian tái nhập (ngày)"), {
			target: { value: "1" },
		});
		fireEvent.change(screen.getByPlaceholderText("Nhập thương hiệu"), {
			target: { value: "Đầu Trâu" },
		});
		fireEvent.change(screen.getByPlaceholderText("Nhập nhà sản xuất"), {
			target: { value: "Công ty ABC" },
		});
		fireEvent.change(
			screen.getByText(/Chọn đơn vị/).closest("select") as HTMLSelectElement,
			{ target: { value: "unit" } },
		);
		fireEvent.click(screen.getByRole("button", { name: "Thêm quy đổi" }));
		fireEvent.change(screen.getByLabelText("Đơn vị quy đổi 1"), {
			target: { value: "box" },
		});
		fireEvent.change(screen.getByLabelText("Hệ số quy đổi 1"), {
			target: { value: "50" },
		});
		fireEvent.change(screen.getAllByPlaceholderText("0")[1], {
			target: { value: "100" },
		});
		fireEvent.submit(
			screen
				.getAllByRole("button", { name: "Thêm sản phẩm" })[0]
				.closest("form") as HTMLFormElement,
		);
		await waitFor(() =>
			expect(createTenantProduct).toHaveBeenCalledWith(
				expect.objectContaining({
					brandName: "Đầu Trâu",
					manufacturerName: "Công ty ABC",
					conversions: [{ unitId: "box", factor: 50, kind: "BOTH" }],
					businessGroup: "CROP_INPUTS",
					productKind: "PESTICIDE",
					attrs: {
						activeIngredient: "Fipronil",
						concentration: "800 g/kg",
						phiDays: 7,
							reiDays: 1,
					},
				}),
			),
		);
		expect(screen.queryByText("Danh mục")).not.toBeInTheDocument();
	});

	it("hydrates edit group, kind, and attrs", () => {
		render(
			<ProductForm
				mode="edit"
				product={{
					...productFixture,
					businessGroup: "VETERINARY_DRUGS",
					productKind: "VET_DRUG",
					attrs: { activeIngredient: "Amoxicillin", dosageForm: "Tiêm" },
				}}
				lookups={lookups}
			/>,
		);
		expect(screen.getByLabelText("Nhóm ngành hàng")).toHaveValue(
			"VETERINARY_DRUGS",
		);
		expect(screen.queryByLabelText("Loại sản phẩm")).not.toBeInTheDocument();
		expect(screen.getByLabelText("Hoạt chất")).toHaveValue("Amoxicillin");
		expect(screen.getByLabelText("Dạng bào chế")).toHaveValue("Tiêm");
	});

	it("renders API attr errors inline without exposing the backend message", async () => {
		createTenantProduct.mockRejectedValue(
			Object.assign(new Error("Thông tin chưa hợp lệ"), {
				serverMessage: "attrs.activeIngredient is required for PESTICIDE",
			}),
		);
		render(<ProductForm mode="create" lookups={lookups} />);
		fireEvent.change(screen.getByLabelText("Nhóm ngành hàng"), {
			target: { value: "CROP_INPUTS" },
		});
		fireEvent.change(screen.getByLabelText("Loại sản phẩm"), {
			target: { value: "PESTICIDE" },
		});
		fireEvent.change(screen.getByLabelText("Hoạt chất"), {
			target: { value: "Fipronil" },
		});
		fireEvent.change(screen.getByLabelText("Nồng độ / hàm lượng"), {
			target: { value: "800 g/kg" },
		});
		fireEvent.change(screen.getByLabelText("Thời gian cách ly (ngày)"), {
			target: { value: "7" },
		});
		fireEvent.change(screen.getByLabelText("Thời gian tái nhập (ngày)"), {
			target: { value: "1" },
		});
		fireEvent.submit(
			screen
				.getAllByRole("button", { name: "Thêm sản phẩm" })[0]
				.closest("form") as HTMLFormElement,
		);
		await waitFor(() =>
			expect(
				document.getElementById("activeIngredient-error"),
			).toHaveTextContent("Thông tin chuyên ngành này chưa hợp lệ."),
		);
		expect(screen.getByLabelText("Hoạt chất")).toHaveAttribute(
			"aria-invalid",
			"true",
		);
		expect(
			screen.queryByText("attrs.activeIngredient is required for PESTICIDE"),
		).not.toBeInTheDocument();
	});

	it("uses the deterministic crop legacy fallback in edit mode", () => {
		render(
			<ProductForm
				mode="edit"
				product={{
					...productFixture,
					domain: "CROP",
					businessGroup: "CROP_SEEDLINGS",
				}}
				lookups={lookups}
			/>,
		);
		expect(screen.getByLabelText("Loại sản phẩm")).toHaveValue("CROP_SEED");
	});
});
