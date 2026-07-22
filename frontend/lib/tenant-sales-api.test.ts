import { describe, expect, it, vi } from "vitest";
import { cancelOrder, completeOrder, createOrder, createQuickSale, getOrder, listOrders } from "./tenant-sales-api";

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

	it("serializes order queries and lifecycle payloads", async () => {
		userFetch.mockResolvedValue({ items: [], page: 1, pageSize: 20, total: 0 });
		await listOrders({ search: "Anh Ba", status: "DRAFT", page: 2, pageSize: 20 });
		expect(userFetch).toHaveBeenLastCalledWith("/tenant/sales/orders?search=Anh+Ba&status=DRAFT&page=2&pageSize=20");
		await getOrder("order-1");
		expect(userFetch).toHaveBeenLastCalledWith("/tenant/sales/orders/order-1");
		const input = { idempotencyKey: "key", status: "COMPLETED" as const, discountAmount: 0, lines: [{ productId: "p", unitId: "u", qty: "1.00", unitPrice: 100 }] };
		await createOrder(input);
		expect(userFetch).toHaveBeenLastCalledWith("/tenant/sales/orders", { method: "POST", body: JSON.stringify(input) });
		const withSettlement = { ...input, settlement: { paymentMethod: "CASH" as const, amountPaid: 100 } };
		await createOrder(withSettlement);
		expect(userFetch).toHaveBeenLastCalledWith("/tenant/sales/orders", { method: "POST", body: JSON.stringify({ ...input, paymentMethod: "CASH", amountPaid: 100 }) });
		await completeOrder("order-1", { paymentMethod: "BANK_TRANSFER", amountPaid: 100 });
		expect(userFetch).toHaveBeenLastCalledWith("/tenant/sales/orders/order-1/complete", { method: "POST", body: JSON.stringify({ paymentMethod: "BANK_TRANSFER", amountPaid: 100 }) });
		await cancelOrder("order-1");
		expect(userFetch).toHaveBeenLastCalledWith("/tenant/sales/orders/order-1/cancel", { method: "POST", body: JSON.stringify({}) });
	});

	it("propagates typed auth and business errors", async () => {
		for (const status of [401, 403, 404, 409, 422]) {
			const error = Object.assign(new Error("api error"), { status, reason: undefined });
			userFetch.mockRejectedValueOnce(error);
			await expect(listOrders()).rejects.toMatchObject({ status });
		}
		const network = Object.assign(new Error("network"), { reason: "NETWORK_ERROR" });
		userFetch.mockRejectedValueOnce(network);
		await expect(cancelOrder("order-1")).rejects.toMatchObject({ reason: "NETWORK_ERROR" });
	});
});
