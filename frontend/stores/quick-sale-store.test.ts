import { beforeEach, describe, expect, it } from "vitest";
import { useQuickSaleStore } from "./quick-sale-store";

const line = {
	productId: "p1",
	unitId: "u1",
	name: "Phân bón",
	unit: "bao",
	qty: 2,
	price: 100000,
};

describe("quick-sale-store", () => {
	beforeEach(() => {
		useQuickSaleStore.getState().clearDraft();
	});

	it("keeps the draft cart and related checkout context in the store", () => {
		const store = useQuickSaleStore.getState();
		store.setLines([line]);
		store.setCustomerId("customer-1");
		store.setHandbookMeta({ diseaseId: "disease-1" });
		store.setIdempotencyKey("sale-key");

		expect(useQuickSaleStore.getState()).toMatchObject({
			lines: [line],
			customerId: "customer-1",
			handbookMeta: { diseaseId: "disease-1" },
			idempotencyKey: "sale-key",
		});
	});

	it("supports line updates and clears the complete draft", () => {
		const store = useQuickSaleStore.getState();
		store.setLines([line]);
		store.setLines((current) => current.map((item) => ({ ...item, qty: 3 })));

		expect(useQuickSaleStore.getState().lines[0]?.qty).toBe(3);

		store.setCustomerId("customer-1");
		store.setIdempotencyKey("sale-key");
		store.clearDraft();

		expect(useQuickSaleStore.getState()).toMatchObject({
			lines: [],
			customerId: undefined,
			handbookMeta: {},
			idempotencyKey: null,
		});
	});

	it("invalidates the retry key when the sale payload changes", () => {
		const store = useQuickSaleStore.getState();
		store.setLines([line]);
		store.setIdempotencyKey("sale-key");

		store.setLines((current) => current.map((item) => ({ ...item, qty: 4 })));
		expect(useQuickSaleStore.getState().idempotencyKey).toBeNull();

		store.setIdempotencyKey("sale-key");
		store.setCustomerId("customer-1");
		expect(useQuickSaleStore.getState().idempotencyKey).toBeNull();
	});
});
