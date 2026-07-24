import { userFetch } from "@/lib/user-fetch";

export type StockAdjustmentStatus = "DRAFT" | "COMPLETED";

export type StockAdjustmentLine = {
	id: string;
	productId: string;
	batchId: string | null;
	qtyBefore: string;
	qtyAfter: string;
	delta: string;
	reasonCode: string;
};

export type StockAdjustment = {
	id: string;
	docNo: string;
	warehouseId: string;
	status: StockAdjustmentStatus;
	note: string | null;
	createdBy: string | null;
	createdAt: string;
	lines: StockAdjustmentLine[];
};

export type StockAdjustmentListResponse = {
	items: StockAdjustment[];
	page: number;
	pageSize: number;
	total: number;
};

export type StockAdjustmentLineInput = {
	productId: string;
	delta: string;
	reasonCode: string;
	batchId?: string;
};

export type CreateStockAdjustmentInput = {
	warehouseId: string;
	note?: string;
	lines: StockAdjustmentLineInput[];
};

export type StockAdjustmentListParams = {
	page?: number;
	pageSize?: number;
	status?: StockAdjustmentStatus;
};

const base = "/tenant/stock-adjustments";

function boundedInteger(
	value: number | undefined,
	fallback: number,
	maximum?: number,
): number {
	if (value === undefined || !Number.isFinite(value)) return fallback;
	const integer = Math.max(1, Math.trunc(value));
	return maximum === undefined ? integer : Math.min(maximum, integer);
}

export function listTenantStockAdjustments(
	params: StockAdjustmentListParams = {},
): Promise<StockAdjustmentListResponse> {
	const query = new URLSearchParams();
	const boundedParams: StockAdjustmentListParams = {
		page: boundedInteger(params.page, 1),
		pageSize: boundedInteger(params.pageSize, 20, 20),
		status: params.status,
	};
	for (const [key, value] of Object.entries(boundedParams)) {
		if (value !== undefined) query.set(key, String(value));
	}
	return userFetch<StockAdjustmentListResponse>(
		query.size ? `${base}?${query.toString()}` : base,
	);
}

export function getTenantStockAdjustment(id: string): Promise<StockAdjustment> {
	return userFetch<StockAdjustment>(`${base}/${id}`);
}

export function createTenantStockAdjustment(
	input: CreateStockAdjustmentInput,
): Promise<StockAdjustment> {
	return userFetch<StockAdjustment>(base, {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export function completeTenantStockAdjustment(
	id: string,
): Promise<StockAdjustment> {
	return userFetch<StockAdjustment>(`${base}/${id}/complete`, {
		method: "POST",
	});
}
