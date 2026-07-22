import { userFetch } from "@/lib/user-fetch";

export type DebtPartyType = "CUSTOMER" | "SUPPLIER";
export type DebtPaymentMethod = "CASH" | "BANK_TRANSFER" | "QR";
export type DebtApiItem = {
	id: string;
	partyType: DebtPartyType;
	name: string;
	code: string | null;
	phone: string | null;
	address: string | null;
	balance: number;
	openingBalance: number;
};
export type DebtListResponse = {
	items: DebtApiItem[];
	totals: { balance: number };
	page: number;
	pageSize: number;
	total: number;
};
export type DebtDetailResponse = {
	party: DebtApiItem;
	balance: number;
	summary: { charged: number; decreased: number };
	entries: Array<{
		id: string;
		entryType: string;
		direction: "INCREASE" | "DECREASE";
		amount: number;
		balanceAfter: number;
		occurredAt: string;
		note: string | null;
		refType: string | null;
		refId: string | null;
	}>;
	vouchers: Array<{
		id: string;
		docNo: string;
		amount: number;
		method: DebtPaymentMethod;
		occurredAt: string;
		note: string | null;
	}>;
};

const base = "/tenant/debts";
const qs = (params: Record<string, string | number | undefined>) => {
	const q = new URLSearchParams();
	for (const [key, value] of Object.entries(params))
		if (value !== undefined && value !== "") q.set(key, String(value));
	return q.size ? `?${q.toString()}` : "";
};
export function listDebts(
	params: {
		partyType?: DebtPartyType;
		search?: string;
		status?: "ALL" | "OWING" | "PAID";
		page?: number;
		pageSize?: number;
	} = {},
) {
	return userFetch<DebtListResponse>(base + qs(params));
}
export function getDebtDetail(type: DebtPartyType, id: string) {
	return userFetch<DebtDetailResponse>(`${base}/${type}/${id}`);
}
export function createDebtVoucher(input: {
	voucherType: "RECEIPT" | "PAYMENT";
	partyType: DebtPartyType;
	partyId: string;
	amount: number;
	method: DebtPaymentMethod;
	note?: string;
	idempotencyKey?: string;
}) {
	return userFetch(`${base}/vouchers`, {
		method: "POST",
		body: JSON.stringify({
			...input,
			idempotencyKey: input.idempotencyKey ?? crypto.randomUUID(),
		}),
	});
}
