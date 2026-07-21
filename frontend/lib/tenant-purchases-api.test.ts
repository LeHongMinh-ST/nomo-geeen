import { beforeEach, describe, expect, it, vi } from "vitest";
import { userFetch } from "@/lib/user-fetch";
import {
	completeTenantPurchase,
	createTenantPurchase,
	listTenantPurchases,
} from "./tenant-purchases-api";

vi.mock("@/lib/user-fetch", () => ({ userFetch: vi.fn() }));
const mocked = vi.mocked(userFetch);
describe("tenant purchase api", () => {
	beforeEach(() => mocked.mockReset());
	it("lists bounded purchase pages", () => {
		listTenantPurchases({ page: 2, pageSize: 20, status: "DRAFT" });
		expect(mocked).toHaveBeenCalledWith(
			"/tenant/purchases?page=2&pageSize=20&status=DRAFT",
		);
	});
	it("sends derived fields only as server contract inputs", () => {
		createTenantPurchase({
			idempotencyKey: "k",
			supplierId: "s",
			status: "DRAFT",
			discountAmount: 0,
			shippingFee: 0,
			amountPaid: 0,
			paymentMethod: "DEBT",
			lines: [{ productId: "p", unitId: "u", qty: "2.5", unitPrice: 1000 }],
		});
		expect(mocked).toHaveBeenCalledWith(
			"/tenant/purchases",
			expect.objectContaining({ method: "POST" }),
		);
		expect(JSON.parse(String(mocked.mock.calls[0][1]?.body))).toMatchObject({
			idempotencyKey: "k",
			supplierId: "s",
			lines: [{ qty: "2.5" }],
		});
	});
	it("completes through the dedicated route", () => {
		completeTenantPurchase("purchase-1", "retry-1");
		expect(mocked).toHaveBeenCalledWith(
			"/tenant/purchases/purchase-1/complete",
			{ method: "POST", body: '{"idempotencyKey":"retry-1"}' },
		);
	});
});
