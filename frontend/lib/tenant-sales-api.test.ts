import { describe, expect, it, vi } from "vitest";
import { createQuickSale } from "./tenant-sales-api";

const { userFetch } = vi.hoisted(() => ({ userFetch: vi.fn() }));
vi.mock("./user-fetch", () => ({ userFetch }));

describe("tenant sales API", () => {
	it("sends the canonical authenticated quick-sale payload", async () => {
		userFetch.mockResolvedValueOnce({ id: "sale-1", status: "COMPLETED" });
		const input = {
			idempotencyKey: "key-1",
			paymentMethod: "CASH" as const,
			amountPaid: 1000,
			discountAmount: 0,
			lines: [{ productId: "p1", unitId: "u1", qty: 1, unitPrice: 1000 }],
		};

		await expect(createQuickSale(input)).resolves.toEqual({
			id: "sale-1",
			status: "COMPLETED",
		});
		expect(userFetch).toHaveBeenCalledWith("/tenant/sales/quick", {
			method: "POST",
			body: JSON.stringify(input),
		});
	});
});
