import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CounterSearch } from "./counter-search";

const suggestion = {
	productId: "product-1",
	name: "Thuốc A",
	unitId: "unit-bottle",
	unit: "Chai",
	unitPrice: 75000,
	availableQty: 12,
	available: true,
	reason: "PROTOCOL",
	warnings: [],
};

vi.mock("./handbook-quick-panel", () => ({
	HandbookQuickPanel: ({
		onAddSuggestion,
	}: {
		onAddSuggestion: (value: typeof suggestion, quantity?: number) => void;
	}) => (
		<button type="button" onClick={() => onAddSuggestion(suggestion, 3)}>
			Thêm gợi ý
		</button>
	),
}));

describe("CounterSearch handbook mapping", () => {
	it("maps the handbook unit and pack quantity into the cart callback", () => {
		const onSelectProduct = vi.fn();
		render(
			<CounterSearch
				onSelectProduct={onSelectProduct}
				onChangeMeta={vi.fn()}
			/>,
		);
		fireEvent.click(document.querySelector("button") as HTMLButtonElement);

		expect(onSelectProduct).toHaveBeenCalledWith(
			expect.objectContaining({
				id: "product-1",
				baseUnit: "Chai",
				baseUnitId: "unit-bottle",
				salePrice: 75000,
				stock: 12,
			}),
			3,
		);
	});
});
