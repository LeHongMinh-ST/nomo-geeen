import { adminFetch } from "./fetch";

export type AdminDashboardSummary = {
	updatedAt: string;
	kpis: {
		activeStores: number;
		users: number;
		revenueThisMonth: string;
		transactionsToday: number;
	};
	alerts: {
		expiringSubscriptions: number;
		overdueInvoices: number;
		systemWarnings: number;
	};
	revenueByMonth: Array<{ label: string; value: string }>;
	recentStores: Array<{
		id: string;
		name: string;
		owner: string;
		plan: string;
		joined: string;
		status: "active" | "trial" | "overdue";
	}>;
};

export function getAdminDashboardSummary(accessToken: string) {
	return adminFetch<AdminDashboardSummary>("/admin/dashboard/summary", {
		accessToken,
	});
}
