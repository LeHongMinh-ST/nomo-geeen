import { userFetch } from "@/lib/user-fetch";

const base = "/tenant/reports";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;

/** Phase-1 BusinessGroup enum — must match Prisma / product-contract. */
export const REPORT_BUSINESS_GROUPS = [
	{
		id: "CROP_INPUTS",
		label: "Thuốc bảo vệ thực vật + Phân bón",
	},
	{ id: "CROP_SEEDLINGS", label: "Cây giống" },
	{ id: "ANIMAL_FEED", label: "Thức ăn chăn nuôi" },
	{ id: "VETERINARY_DRUGS", label: "Thuốc thú y" },
	{ id: "LIVESTOCK", label: "Con giống" },
] as const;

export type ReportBusinessGroupId =
	(typeof REPORT_BUSINESS_GROUPS)[number]["id"];

export type StockSummaryBatch = {
	id: string;
	productId: string;
	warehouseId: string;
	batchCode: string;
	expiresAt: string | null;
	qtyOnHand: string;
	isRecalled: boolean;
};

export type StockSummaryProduct = {
	id: string;
	sku: string;
	name: string;
	productKind: string;
	businessGroup: string | null;
	baseUnitId: string;
};

export type StockSummaryItem = {
	warehouseId: string;
	product: StockSummaryProduct;
	qty: string;
	avgCost: string;
	batches: StockSummaryBatch[];
};

export type StockGroupBreakdown = {
	businessGroup: string;
	label: string;
	itemCount: number;
	qty: string;
};

export type StockSummaryResponse = {
	filter: { businessGroup: string | null };
	byBusinessGroup: StockGroupBreakdown[];
	items: StockSummaryItem[];
};

export type SalesTopProduct = {
	productId: string;
	name: string;
	qtyBase: string;
	total: string;
};

export type SalesGroupBreakdown = {
	businessGroup: string;
	label: string;
	lineCount: number;
	qtyBase: string;
	total: string;
};

export type SalesSummaryResponse = {
	from: string;
	to: string;
	filter: { businessGroup: string | null };
	orders: number;
	total: string;
	amountPaid: string;
	debtAmount: string;
	byBusinessGroup: SalesGroupBreakdown[];
	topProducts: SalesTopProduct[];
};

export type ReportDateRange = {
	from: string;
	to: string;
};

export type ReportFilter = Partial<ReportDateRange> & {
	businessGroup?: ReportBusinessGroupId | "";
};

export type ReportRangeValidation =
	| { ok: true; from: Date; to: Date }
	| { ok: false; reason: "INVALID_REPORT_RANGE" | "REPORT_RANGE_TOO_LARGE" };

/** Mirror backend ReportsService.range rules for client preflight. */
export function validateReportDateRange(
	range: Partial<ReportDateRange> = {},
): ReportRangeValidation {
	const to = range.to ? new Date(range.to) : new Date();
	const from = range.from
		? new Date(range.from)
		: new Date(to.getTime() - 30 * MS_PER_DAY);
	if (
		Number.isNaN(from.getTime()) ||
		Number.isNaN(to.getTime()) ||
		from >= to
	) {
		return { ok: false, reason: "INVALID_REPORT_RANGE" };
	}
	if (to.getTime() - from.getTime() > MAX_RANGE_DAYS * MS_PER_DAY) {
		return { ok: false, reason: "REPORT_RANGE_TOO_LARGE" };
	}
	return { ok: true, from, to };
}

export function defaultReportDateRange(
	now: Date = new Date(),
): ReportDateRange {
	const to = new Date(now);
	const from = new Date(now.getTime() - 30 * MS_PER_DAY);
	return {
		from: toIsoDateInput(from),
		to: toIsoDateInput(to),
	};
}

export function toIsoDateInput(value: Date): string {
	const y = value.getFullYear();
	const m = String(value.getMonth() + 1).padStart(2, "0");
	const d = String(value.getDate()).padStart(2, "0");
	return `${y}-${m}-${d}`;
}

export function businessGroupLabel(id: string | null | undefined): string {
	if (!id || id === "UNGROUPED") return "Chưa gán nhóm";
	return REPORT_BUSINESS_GROUPS.find((g) => g.id === id)?.label ?? id;
}

function appendBusinessGroup(
	q: URLSearchParams,
	businessGroup?: string | null,
) {
	if (businessGroup) q.set("businessGroup", businessGroup);
}

export function getTenantStockSummary(
	params: { businessGroup?: ReportBusinessGroupId | "" } = {},
): Promise<StockSummaryResponse> {
	const q = new URLSearchParams();
	appendBusinessGroup(q, params.businessGroup || undefined);
	const path = q.size
		? `${base}/stock-summary?${q.toString()}`
		: `${base}/stock-summary`;
	return userFetch<StockSummaryResponse>(path);
}

export function getTenantSalesSummary(
	params: ReportFilter = {},
): Promise<SalesSummaryResponse> {
	const validated = validateReportDateRange(params);
	if (!validated.ok) {
		throw Object.assign(new Error(rangeErrorMessage(validated.reason)), {
			reason: validated.reason,
			status: 400,
		});
	}
	const q = new URLSearchParams();
	if (params.from) q.set("from", params.from);
	if (params.to) q.set("to", params.to);
	appendBusinessGroup(q, params.businessGroup || undefined);
	const path = q.size
		? `${base}/sales-summary?${q.toString()}`
		: `${base}/sales-summary`;
	return userFetch<SalesSummaryResponse>(path);
}

/** Prefer mapTenantApiError({ reason }) in UI; kept for client throw message. */
export function rangeErrorMessage(
	reason: "INVALID_REPORT_RANGE" | "REPORT_RANGE_TOO_LARGE",
): string {
	return reason === "REPORT_RANGE_TOO_LARGE"
		? "Khoảng thời gian báo cáo quá dài. Vui lòng thu hẹp khoảng ngày."
		: "Khoảng thời gian báo cáo không hợp lệ. Vui lòng chọn lại ngày.";
}
