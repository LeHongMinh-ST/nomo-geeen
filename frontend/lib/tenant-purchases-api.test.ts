import { beforeEach, describe, expect, it, vi } from "vitest";
import { userFetch } from "@/lib/user-fetch";
import {
	completeTenantPurchase,
	createTenantPurchase,
	listTenantPurchases,
	mapTenantPurchase,
	type PurchaseResponse,
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
	it("sends the manufacture date on each purchase line", () => {
		createTenantPurchase({
			idempotencyKey: "k",
			supplierId: "s",
			status: "DRAFT",
			discountAmount: 0,
			shippingFee: 0,
			amountPaid: 0,
			paymentMethod: "DEBT",
			lines: [
				{
					productId: "p",
					unitId: "u",
					qty: "2",
					unitPrice: 1000,
					batchCode: "LOT-A",
					manufacturedAt: "2026-01-15",
					expiresAt: "2027-01-15",
				},
			],
		});
		expect(JSON.parse(String(mocked.mock.calls[0][1]?.body))).toMatchObject({
			lines: [{ manufacturedAt: "2026-01-15", expiresAt: "2027-01-15" }],
		});
	});
	it("maps ISO datetimes back to date-only fields for the line editor", () => {
		const response = {
			id: "pn1",
			docNo: "PN-0001",
			idempotencyKey: "k",
			status: "COMPLETED",
			supplierId: "s",
			warehouseId: "w",
			subtotal: 2000,
			discountAmount: 0,
			shippingFee: 0,
			total: 2000,
			amountPaid: 0,
			debtAmount: 2000,
			paymentMethod: "DEBT",
			createdAt: "2026-07-26",
			completedAt: null,
			lines: [
				{
					id: "l1",
					productId: "p",
					unitId: "u",
					qty: "2",
					qtyBase: "2",
					unitPrice: 1000,
					lineTotal: 2000,
					batchCode: "LOT-A",
					manufacturedAt: "2026-01-15T00:00:00.000Z",
					expiresAt: "2027-01-15T00:00:00.000Z",
				},
			],
		} as unknown as PurchaseResponse;
		expect(mapTenantPurchase(response).lines[0]).toMatchObject({
			manufacturedAt: "2026-01-15",
			expiry: "2027-01-15",
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
