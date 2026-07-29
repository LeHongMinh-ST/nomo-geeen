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

const { createTenantProduct, updateTenantProduct, getTenantBusinessGroups } =
	vi.hoisted(() => ({
		createTenantProduct: vi.fn(),
		updateTenantProduct: vi.fn(),
		getTenantBusinessGroups: vi.fn(),
	}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/lib/tenant-products-api", () => ({
	createTenantProduct,
	updateTenantProduct,
	getTenantBusinessGroups,
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
	baseUnitId: undefined,
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
		getTenantBusinessGroups.mockResolvedValue({
			configured: false,
			groups: [],
		});
	});

	it("filters kind choices while specialist fields stay hidden during create", async () => {
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
		expect(screen.queryByLabelText("Hoạt chất")).not.toBeInTheDocument();
		expect(
			screen.queryByLabelText("Nồng độ / hàm lượng"),
		).not.toBeInTheDocument();
	});

	it("auto-selects the only kind and hides the kind selector", () => {
		render(<ProductForm mode="create" lookups={lookups} />);

		fireEvent.change(screen.getByLabelText("Nhóm ngành hàng"), {
			target: { value: "ANIMAL_FEED" },
		});

		expect(screen.queryByLabelText("Loại sản phẩm")).not.toBeInTheDocument();
		expect(screen.getAllByText("Thức ăn chăn nuôi")).toHaveLength(1);
	});

	it("renders one purchased group as a fixed value without a chevron", async () => {
		getTenantBusinessGroups.mockResolvedValue({
			configured: true,
			groups: [{ businessGroup: "ANIMAL_FEED", enabled: true }],
		});
		render(<ProductForm mode="create" lookups={lookups} />);

		await waitFor(() =>
			expect(screen.getByLabelText("Nhóm ngành hàng")).toHaveTextContent(
				"Thức ăn chăn nuôi",
			),
		);
		expect(screen.getByLabelText("Nhóm ngành hàng")).not.toHaveAttribute(
			"aria-expanded",
		);
		expect(
			screen.queryByRole("combobox", { name: "Nhóm ngành hàng" }),
		).not.toBeInTheDocument();
		expect(screen.queryByLabelText("Loại sản phẩm")).not.toBeInTheDocument();
	});

	it("hides post-create operational sections and the required-kind helper on create", () => {
		render(<ProductForm mode="create" lookups={lookups} />);

		expect(screen.queryByText("Đơn vị & quy đổi")).not.toBeInTheDocument();
		expect(screen.queryByText("Tồn kho")).not.toBeInTheDocument();
		expect(
			screen.queryByText(/Thông tin bắt buộc cho:/),
		).not.toBeInTheDocument();
	});

	it("does not require specialist attrs during create", async () => {
		createTenantProduct.mockResolvedValue({ id: "created" });
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
		await waitFor(() => expect(createTenantProduct).toHaveBeenCalled());
	});

	it("does not require a base unit when creating", async () => {
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
			{ target: { value: "NPK 15" } },
		);
		fireEvent.submit(
			screen
				.getAllByRole("button", { name: "Thêm sản phẩm" })[0]
				.closest("form") as HTMLFormElement,
		);
		await waitFor(() =>
			expect(createTenantProduct).toHaveBeenCalledWith(
				expect.objectContaining({ baseUnitId: undefined }),
			),
		);
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
		expect(
			screen.getByPlaceholderText("Tự sinh khi lưu sản phẩm"),
		).toHaveAttribute("readonly");
		fireEvent.change(screen.getByPlaceholderText("Nhập thương hiệu"), {
			target: { value: "Đầu Trâu" },
		});
		fireEvent.change(screen.getByPlaceholderText("Nhập nhà sản xuất"), {
			target: { value: "Công ty ABC" },
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
					conversions: [],
					businessGroup: "CROP_INPUTS",
					productKind: "PESTICIDE",
					attrs: {},
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
		expect(screen.getByText("Đơn vị & quy đổi")).toBeInTheDocument();
		expect(screen.getByText("Tồn kho")).toBeInTheDocument();
	});

	it("limits base unit options to Gói, Chai, and kg and preserves allowed edit value", () => {
		render(
			<ProductForm
				mode="edit"
				product={{ ...productFixture, baseUnitId: "kilo" }}
				lookups={{
					...lookups,
					units: [
						{ id: "package", code: "GOI", name: "Gói" },
						{ id: "bottle", code: "CHAI", name: "Chai" },
						{ id: "kilo", code: "KG", name: "Kilôgam" },
						{ id: "bag", code: "BAO", name: "Bao" },
					],
				}}
			/>,
		);

		const baseUnit = screen.getByLabelText(
			"Đơn vị tồn kho gốc (Base Unit)",
		) as HTMLSelectElement;
		expect(
			within(baseUnit)
				.getAllByRole("option")
				.map((option) => option.textContent),
		).toEqual(["Chọn đơn vị (Chai, Kg, Gói...)", "Gói", "Chai", "kg"]);
		expect(baseUnit).toHaveValue("kilo");
	});

	it("clears a disallowed edit base unit", () => {
		render(
			<ProductForm
				mode="edit"
				product={{ ...productFixture, baseUnitId: "bag" }}
				lookups={{
					...lookups,
					units: [{ id: "bag", code: "BAO", name: "Bao" }],
				}}
			/>,
		);
		expect(
			screen.getByRole("combobox", {
				name: "Đơn vị tồn kho gốc (Base Unit)",
			}),
		).toHaveValue("");
	});

	it("renders API attr errors inline without exposing the backend message", async () => {
		updateTenantProduct.mockRejectedValue(
			Object.assign(new Error("Thông tin chưa hợp lệ"), {
				serverMessage: "attrs.activeIngredient is required for PESTICIDE",
			}),
		);
		render(
			<ProductForm
				mode="edit"
				product={{
					...productFixture,
					businessGroup: "CROP_INPUTS",
					productKind: "PESTICIDE",
				}}
				lookups={lookups}
			/>,
		);
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
				.getAllByRole("button", { name: "Lưu thay đổi" })[0]
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
