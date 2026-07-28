import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTenantHomeSummary } from "@/lib/tenant-dashboard-api";
import { HomeDashboard } from "./home-dashboard";

vi.mock("@/lib/tenant-dashboard-api", async () => {
	const actual = await vi.importActual<
		typeof import("@/lib/tenant-dashboard-api")
	>("@/lib/tenant-dashboard-api");
	return {
		...actual,
		getTenantHomeSummary: vi.fn(),
	};
});

vi.mock("@/stores/user-auth-store", () => ({
	useUserAuth: (selector: (state: unknown) => unknown) =>
		selector({
			user: { fullName: "Nguyễn Minh Tâm" },
			hasHydrated: true,
			accessToken: "token",
		}),
}));

const mocked = vi.mocked(getTenantHomeSummary);

const summary = {
	generatedAt: "2026-07-28T03:00:00.000Z",
	timezone: "Asia/Ho_Chi_Minh",
	today: {
		revenue: "12480000",
		orders: 27,
		previousRevenue: "11500000",
		previousOrders: 20,
	},
	month: {
		revenue: "284600000",
		orders: 400,
		previousRevenue: "250000000",
		previousOrders: 350,
	},
	receivable: { balance: "48350000", customers: 12 },
	alerts: {
		lowStock: 6,
		debtOwing: 4,
		nearExpiry: 3,
		lowStockThreshold: 10,
	},
	last7Days: [
		{ date: "2026-07-22", label: "T4", revenue: "8200000" },
		{ date: "2026-07-23", label: "T5", revenue: "10500000" },
		{ date: "2026-07-24", label: "T6", revenue: "7400000" },
		{ date: "2026-07-25", label: "T7", revenue: "13100000" },
		{ date: "2026-07-26", label: "CN", revenue: "11800000" },
		{ date: "2026-07-27", label: "T2", revenue: "15600000" },
		{ date: "2026-07-28", label: "T3", revenue: "12480000" },
	],
	topProducts: [
		{
			productId: "p1",
			name: "Phân bón NPK Đầu Trâu 20-20-15",
			qtyBase: "148",
			total: "37000000",
		},
	],
};

describe("HomeDashboard", () => {
	beforeEach(() => {
		mocked.mockReset();
	});

	it("renders live home summary without mock KPIs", async () => {
		mocked.mockResolvedValue(summary);
		render(<HomeDashboard />);
		await waitFor(() => {
			expect(screen.getByText("Chào Tâm")).toBeInTheDocument();
		});
		expect(screen.getByText("27 đơn")).toBeInTheDocument();
		expect(screen.getByText("12 khách")).toBeInTheDocument();
		expect(screen.getAllByText("Hàng sắp hết").length).toBeGreaterThan(0);
		expect(
			screen.getByText("Phân bón NPK Đầu Trâu 20-20-15"),
		).toBeInTheDocument();
		expect(mocked).toHaveBeenCalled();
	});

	it("shows error and retry without inventing numbers", async () => {
		mocked.mockRejectedValue({ reason: "NETWORK_ERROR" });
		render(<HomeDashboard />);
		await waitFor(() => {
			expect(screen.getByRole("alert")).toBeInTheDocument();
		});
		expect(
			screen.getByRole("button", { name: /Thử lại/i }),
		).toBeInTheDocument();
		expect(screen.queryByText("27 đơn")).not.toBeInTheDocument();
	});
});
