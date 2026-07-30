import { adminFetch } from "./fetch";

export type BillingCycle = "MONTHLY" | "QUARTERLY" | "YEARLY";

export interface InvoiceTransactionResponse {
	id: string;
	invoiceNumber: string;
	tenantId: string;
	tenantName: string;
	tenantSlug: string;
	amount: string;
	status: string;
	paymentStatus: string;
	paymentMethod: string | null;
	paidAt: string | null;
	issuedAt: string | null;
	dueAt: string | null;
	periodStart: string | null;
	periodEnd: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ListInvoiceTransactionsResult {
	items: InvoiceTransactionResponse[];
	page: number;
	pageSize: number;
	total: number;
}

export interface InvoiceTransactionQuery {
	page?: number;
	pageSize?: number;
	q?: string;
	status?: string;
	paymentStatus?: string;
	tenantId?: string;
	from?: string;
	to?: string;
}

function queryString(query: InvoiceTransactionQuery): string {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value !== undefined && value !== "") params.set(key, String(value));
	}
	return params.toString();
}

export function listInvoiceTransactions(
	accessToken: string,
	query: InvoiceTransactionQuery = {},
): Promise<ListInvoiceTransactionsResult> {
	const suffix = queryString(query);
	return adminFetch<ListInvoiceTransactionsResult>(
		`/admin/transactions${suffix ? `?${suffix}` : ""}`,
		{ accessToken },
	);
}
