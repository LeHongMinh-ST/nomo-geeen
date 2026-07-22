import { userFetch } from "@/lib/user-fetch";

export type QuickSalePaymentMethod = "CASH" | "TRANSFER" | "QR" | "DEBT";

export type SalesOrderStatus = "DRAFT" | "COMPLETED" | "CANCELLED";
export type SalesOrderPaymentMethod = "CASH" | "BANK_TRANSFER" | "QR" | "DEBT";

export type SalesOrderSummary = {
	id: string;
	docNo: string;
	status: SalesOrderStatus;
	customerName: string | null;
	customerPhone: string | null;
	itemCount: number;
	total: number;
	paymentMethod: SalesOrderPaymentMethod | null;
	soldAt: string | null;
	createdAt: string;
};

export type SalesOrderLine = {
	id: string;
	productId: string;
	productName: string;
	unitId: string;
	unitName: string;
	qty: string;
	qtyBase: string;
	unitPrice: number;
	lineTotal: number;
};

export type SalesOrderDetail = {
	id: string;
	docNo: string;
	channel: "ORDER";
	status: SalesOrderStatus;
	customer: { id: string; name: string; phone: string | null } | null;
	warehouseId: string;
	subtotal: number;
	discountAmount: number;
	total: number;
	amountPaid: number;
	changeAmount: number;
	debtAmount: number;
	paymentMethod: SalesOrderPaymentMethod | null;
	note: string | null;
	soldAt: string | null;
	completedAt: string | null;
	createdAt: string;
	updatedAt: string;
	lines: SalesOrderLine[];
};

export type SalesOrderListResponse = {
	items: SalesOrderSummary[];
	page: number;
	pageSize: number;
	total: number;
};

export type CreateSalesOrderInput = {
	idempotencyKey: string;
	status: Extract<SalesOrderStatus, "DRAFT" | "COMPLETED">;
	customerId?: string;
	discountAmount: number;
	note?: string;
	settlement?: SalesOrderSettlement;
	lines: Array<{ productId: string; unitId: string; qty: string; unitPrice: number }>;
};

export type SalesOrderSettlement = {
	paymentMethod: SalesOrderPaymentMethod;
	amountPaid: number;
};

const orderBase = "/tenant/sales/orders";

function queryString(params: {
	search?: string;
	status?: SalesOrderStatus;
	page?: number;
	pageSize?: number;
}) {
	const query = new URLSearchParams();
	for (const key of ["search", "status", "page", "pageSize"] as const) {
		const value = params[key];
		if (value !== undefined && value !== "") query.set(key, String(value));
	}
	return query.size ? `?${query.toString()}` : "";
}

export function listOrders(params: {
	search?: string;
	status?: SalesOrderStatus;
	page?: number;
	pageSize?: number;
} = {}): Promise<SalesOrderListResponse> {
	return userFetch<SalesOrderListResponse>(`${orderBase}${queryString(params)}`);
}

export function getOrder(id: string): Promise<SalesOrderDetail> {
	return userFetch<SalesOrderDetail>(`${orderBase}/${id}`);
}

export function createOrder(input: CreateSalesOrderInput): Promise<SalesOrderDetail> {
	const { settlement, ...baseInput } = input;
	const payload = settlement ? { ...baseInput, ...settlement } : baseInput;
	return userFetch<SalesOrderDetail>(orderBase, {
		method: "POST",
		body: JSON.stringify(payload),
	});
}

export function completeOrder(id: string, settlement: SalesOrderSettlement): Promise<SalesOrderDetail> {
	return userFetch<SalesOrderDetail>(`${orderBase}/${id}/complete`, {
		method: "POST",
		body: JSON.stringify(settlement),
	});
}

export function cancelOrder(id: string): Promise<SalesOrderDetail> {
	return userFetch<SalesOrderDetail>(`${orderBase}/${id}/cancel`, {
		method: "POST",
		body: JSON.stringify({}),
	});
}

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
