import { userFetch } from "@/lib/user-fetch";

export type HomeDashboardDay = {
	date: string;
	label: string;
	revenue: string;
};

export type HomeDashboardTopProduct = {
	productId: string;
	name: string;
	qtyBase: string;
	total: string;
};

export type HomeDashboardSummary = {
	generatedAt: string;
	timezone: string;
	today: {
		revenue: string;
		orders: number;
		previousRevenue: string;
		previousOrders: number;
	};
	month: {
		revenue: string;
		orders: number;
		previousRevenue: string;
		previousOrders: number;
	};
	receivable: {
		balance: string;
		customers: number;
	};
	alerts: {
		lowStock: number;
		debtOwing: number;
		nearExpiry: number;
		lowStockThreshold: number;
	};
	last7Days: HomeDashboardDay[];
	topProducts: HomeDashboardTopProduct[];
};

export function getTenantHomeSummary(): Promise<HomeDashboardSummary> {
	return userFetch<HomeDashboardSummary>("/tenant/reports/home-summary");
}

/** Percent delta vs previous period; null when previous is zero and current is zero. */
export function revenueDelta(
	current: string | number,
	previous: string | number,
): { text: string; up: boolean } | null {
	const cur = Number(current);
	const prev = Number(previous);
	if (!Number.isFinite(cur) || !Number.isFinite(prev)) return null;
	if (prev === 0 && cur === 0) return null;
	if (prev === 0) {
		return { text: "+100%", up: cur > 0 };
	}
	const pct = Math.round(((cur - prev) / Math.abs(prev)) * 100);
	const up = pct >= 0;
	return { text: `${up ? "+" : ""}${pct}%`, up };
}

export function moneyNumber(value: string | number | null | undefined): number {
	const n = Number(value ?? 0);
	return Number.isFinite(n) ? n : 0;
}
