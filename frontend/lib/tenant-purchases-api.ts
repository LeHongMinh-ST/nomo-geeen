import type {
	PurchaseStatus as LegacyPurchaseStatus,
	Purchase,
} from "@/lib/purchases";
import { userFetch } from "@/lib/user-fetch";

export type PurchaseStatus = "DRAFT" | "COMPLETED" | "CANCELLED";
export type PurchasePaymentMethod = "CASH" | "BANK_TRANSFER" | "QR" | "DEBT";
export type PurchaseLineInput = {
	productId: string;
	unitId: string;
	qty: string;
	unitPrice: number;
	lineDiscount?: number;
	batchCode?: string;
	expiresAt?: string;
};
export type CreatePurchaseInput = {
	idempotencyKey: string;
	supplierId: string;
	lines: PurchaseLineInput[];
	status: "DRAFT" | "COMPLETED";
	discountAmount: number;
	shippingFee: number;
	amountPaid: number;
	paymentMethod: PurchasePaymentMethod;
	note?: string;
};
export type PurchaseLineResponse = PurchaseLineInput & {
	id: string;
	qtyBase: string;
	lineTotal: number;
	productName?: string;
	unit?: { id: string; code: string; name: string };
};
export type PurchaseResponse = {
	id: string;
	docNo: string;
	idempotencyKey: string;
	status: PurchaseStatus;
	supplierId: string;
	supplierName?: string;
	warehouseId: string;
	subtotal: number;
	discountAmount: number;
	shippingFee: number;
	total: number;
	amountPaid: number;
	debtAmount: number;
	paymentMethod: PurchasePaymentMethod;
	lines: PurchaseLineResponse[];
	createdAt: string;
	completedAt: string | null;
};
export type PurchaseListResponse = {
	items: PurchaseResponse[];
	page: number;
	pageSize: number;
	total: number;
};
export type PurchaseApiError = {
	reason: string;
	message: string;
	field?: string;
};
const base = "/tenant/purchases";
export function listTenantPurchases(
	params: {
		page?: number;
		pageSize?: number;
		search?: string;
		status?: PurchaseStatus;
	} = {},
): Promise<PurchaseListResponse> {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(params))
		if (value !== undefined) query.set(key, String(value));
	return userFetch<PurchaseListResponse>(
		query.size ? `${base}?${query.toString()}` : base,
	);
}
export function getTenantPurchase(id: string): Promise<PurchaseResponse> {
	return userFetch<PurchaseResponse>(`${base}/${id}`);
}
export function createTenantPurchase(
	input: CreatePurchaseInput,
): Promise<PurchaseResponse> {
	return userFetch<PurchaseResponse>(base, {
		method: "POST",
		body: JSON.stringify(input),
	});
}
export function updateTenantPurchase(
	id: string,
	input: Partial<CreatePurchaseInput>,
): Promise<PurchaseResponse> {
	return userFetch<PurchaseResponse>(`${base}/${id}`, {
		method: "PATCH",
		body: JSON.stringify(input),
	});
}
export function completeTenantPurchase(
	id: string,
	idempotencyKey: string,
): Promise<PurchaseResponse> {
	return userFetch<PurchaseResponse>(`${base}/${id}/complete`, {
		method: "POST",
		body: JSON.stringify({ idempotencyKey }),
	});
}
export function cancelTenantPurchase(id: string): Promise<PurchaseResponse> {
	return userFetch<PurchaseResponse>(`${base}/${id}/cancel`, {
		method: "POST",
	});
}

export function mapTenantPurchase(item: PurchaseResponse): Purchase {
	return {
		id: item.id,
		code: item.docNo,
		supplierId: item.supplierId,
		supplierName: item.supplierName,
		lines: item.lines.map((line) => ({
			productId: line.productId,
			unitId: line.unitId,
			name: line.productName ?? "Sản phẩm",
			unit: line.unit?.name ?? line.unitId,
			factor: Number(line.qtyBase) / Math.max(Number(line.qty), 1),
			qty: Number(line.qty),
			cost: line.unitPrice,
			batch: line.batchCode,
			expiry: line.expiresAt,
		})),
		discount: item.discountAmount,
		shipping: item.shippingFee,
		status: item.status.toLowerCase() as LegacyPurchaseStatus,
		payment:
			item.paymentMethod === "BANK_TRANSFER" || item.paymentMethod === "QR"
				? "transfer"
				: (item.paymentMethod.toLowerCase() as "cash" | "transfer" | "debt"),
		createdAt: item.createdAt,
		note: undefined,
	};
}
