import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Product } from "@/lib/products";
import { PurchaseForm } from "./purchase-form";

const { createTenantPurchase, routerPush, purchaseProduct } = vi.hoisted(
	() => ({
		createTenantPurchase: vi.fn(),
		routerPush: vi.fn(),
		purchaseProduct: {
			id: "product-1",
			name: "Phân bón test",
			sku: "TEST-01",
			baseUnit: "kg",
			baseUnitId: "unit-kg",
			conversions: [
				{
					unitId: "unit-bao",
					unit: "Bao",
					factor: 40,
					kind: "PURCHASE" as const,
				},
			],
			costPrice: 1000,
			salePrice: 1500,
			priceTiers: [],
			stock: 0,
			lowStockThreshold: 0,
		},
	}),
);

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: routerPush }),
}));
vi.mock("next/link", () => ({
	default: ({ children, href }: { children: ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));
vi.mock("@/components/app/purchase/supplier-picker", () => ({
	SupplierPicker: ({ onChange }: { onChange: (value: string) => void }) => (
		<button type="button" onClick={() => onChange("supplier-1")}>
			Chọn nhà cung cấp test
		</button>
	),
}));
vi.mock("@/components/app/sales/product-picker", () => ({
	ProductPicker: ({ onSelect }: { onSelect: (product: Product) => void }) => (
		<button type="button" onClick={() => onSelect(purchaseProduct)}>
			Thêm sản phẩm test
		</button>
	),
}));
vi.mock("@/lib/tenant-purchases-api", () => ({
	createTenantPurchase,
}));

describe("PurchaseForm lot sale price", () => {
	it("explains the lot price and keeps it separate from converted purchase cost", async () => {
		createTenantPurchase.mockResolvedValue({});
		render(<PurchaseForm />);

		fireEvent.click(
			screen.getByRole("button", { name: "Chọn nhà cung cấp test" }),
		);
		fireEvent.click(screen.getByRole("button", { name: "Thêm sản phẩm test" }));

		const salePrice = screen.getByRole("textbox", {
			name: "Giá bán theo lô cho 1 Bao",
		});
		expect(salePrice).toHaveAttribute(
			"aria-describedby",
			"sale-price-help-product-1",
		);
		expect(
			screen.getByText(
				"Giá bán áp dụng cho 1 Bao của lô này; không cộng vào tiền hàng nhập.",
			),
		).toBeInTheDocument();

		fireEvent.change(salePrice, { target: { value: "70.000" } });
		expect(screen.getAllByText("40.000₫")).toHaveLength(2);
		fireEvent.click(screen.getByRole("button", { name: "Lưu nháp" }));

		await waitFor(() => expect(createTenantPurchase).toHaveBeenCalled());
		expect(createTenantPurchase).toHaveBeenCalledWith(
			expect.objectContaining({
				lines: [
					expect.objectContaining({
						unitId: "unit-bao",
						qty: "1",
						unitPrice: 40_000,
						salePrice: 70_000,
					}),
				],
			}),
		);
	});
});
