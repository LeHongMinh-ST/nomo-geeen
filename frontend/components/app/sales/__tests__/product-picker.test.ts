import { describe, expect, it } from "vitest";
import type { Product } from "@/lib/products";
import { filterSellableProducts } from "../product-picker";

const base: Product = {
	id: "p1",
	name: "NPK 20-20-15",
	sku: "NPK-1",
	barcode: "8930001",
	categoryId: "c1",
	baseUnit: "Bao",
	baseUnitId: "u1",
	conversions: [],
	costPrice: 100,
	salePrice: 200,
	priceTiers: [],
	stock: 10,
	lowStockThreshold: 0,
};

describe("filterSellableProducts", () => {
	it("matches tenant products by name, SKU, and barcode", () => {
		expect(filterSellableProducts([base], "npk")).toHaveLength(1);
		expect(filterSellableProducts([base], "NPK-1")).toHaveLength(1);
		expect(filterSellableProducts([base], "8930001")).toHaveLength(1);
	});

	it("excludes locked, recalled, inactive, and out-of-stock products", () => {
		const products = [
			base,
			{ ...base, id: "p2", locked: true },
			{ ...base, id: "p3", recalled: true },
			{ ...base, id: "p4", status: "inactive" as const },
			{ ...base, id: "p5", stock: 0 },
		];
		expect(filterSellableProducts(products, "").map((product) => product.id)).toEqual([
			"p1",
		]);
	});
});
