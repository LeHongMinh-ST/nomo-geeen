import { userFetch } from "@/lib/user-fetch";

export type QuickSalePaymentMethod = "CASH" | "TRANSFER" | "QR" | "DEBT";

export type CreateQuickSaleInput = {
	idempotencyKey: string;
	customerId?: string;
	paymentMethod: QuickSalePaymentMethod;
	amountPaid: number;
	discountAmount: number;
	lines: Array<{
		productId: string;
		unitId: string;
		qty: number;
		unitPrice: number;
	}>;
};

export type QuickSaleResponse = {
	id: string;
	docNo: string;
	status: "COMPLETED";
	subtotal: number;
	discountAmount: number;
	total: number;
	amountPaid: number;
	changeAmount: number;
	debtAmount: number;
	paymentMethod: QuickSalePaymentMethod;
	lines: Array<{
		productId: string;
		qty: number;
		qtyBase: number;
		unitPrice: number;
		lineTotal: number;
	}>;
};

export function createQuickSale(
	input: CreateQuickSaleInput,
): Promise<QuickSaleResponse> {
	return userFetch<QuickSaleResponse>("/tenant/sales/quick", {
		method: "POST",
		body: JSON.stringify(input),
	});
}
