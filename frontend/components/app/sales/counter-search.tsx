"use client";

import { HandbookQuickPanel } from "@/components/app/sales/handbook-quick-panel";
import type { Product } from "@/lib/products";
import type { QuickHandbookSuggestion } from "@/lib/tenant-handbook-api";

type HandbookMeta = {
	diseaseId?: string;
	consultContext?: Record<string, unknown>;
	suggestedProductsMeta?: Array<Record<string, unknown>>;
	suggestedQtyMeta?: Record<string, unknown>;
};

function suggestionAsProduct(suggestion: QuickHandbookSuggestion): Product {
	return {
		id: suggestion.productId,
		name: suggestion.name,
		sku: suggestion.productId,
		categoryId: "handbook",
		baseUnit: suggestion.unit,
		baseUnitId: suggestion.unitId,
		conversions: [],
		costPrice: 0,
		salePrice: suggestion.unitPrice,
		priceTiers: [],
		stock: suggestion.availableQty,
		lowStockThreshold: 0,
	};
}

export function CounterSearch({
	onSelectProduct,
	onChangeMeta,
}: {
	onSelectProduct: (product: Product, quantity?: number) => void;
	onChangeMeta: (meta: HandbookMeta) => void;
}) {
	function addSuggestion(suggestion: QuickHandbookSuggestion, quantity = 1) {
		if (!suggestion.available) return;
		onSelectProduct(suggestionAsProduct(suggestion), quantity);
	}

	return (
		<HandbookQuickPanel
			onAddProduct={onSelectProduct}
			onAddSuggestion={addSuggestion}
			onChangeMeta={onChangeMeta}
		/>
	);
}
