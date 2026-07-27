import {
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
	ExpiryTier,
	InventoryExpirySummary,
	InventoryListItem,
} from "@/lib/tenant-inventory-api";
import {
	getTenantInventoryExpirySummary,
	listTenantInventory,
} from "@/lib/tenant-inventory-api";
import { InventoryList } from "./inventory-list";

vi.mock("@/lib/tenant-inventory-api", () => ({
	listTenantInventory: vi.fn(),
	getTenantInventoryExpirySummary: vi.fn(),
}));
vi.mock("@/components/app/inventory/adjustment-list", () => ({
	AdjustmentList: () => null,
}));
vi.mock("next/link", () => ({
	default: ({
		children,
		href,
	}: {
		children: React.ReactNode;
		href: string;
	}) => <a href={href}>{children}</a>,
}));

const mockedList = vi.mocked(listTenantInventory);
const mockedSummary = vi.mocked(getTenantInventoryExpirySummary);

function item(overrides: Partial<InventoryListItem> = {}): InventoryListItem {
	return {
		productId: "p1",
		productName: "Thuốc trừ sâu A",
		sku: "SKU-1",
		warehouseId: "w1",
		baseUnitId: "u1",
		baseUnit: "chai",
		qty: "40",
		avgCost: "1000",
		updatedAt: "2026-07-26T00:00:00.000Z",
		nextExpiry: null,
		expiryTier: "NONE",
		batches: [],
		...overrides,
	};
}

function emptyByTier(): Record<ExpiryTier, number> {
	return { EXPIRED: 0, CRITICAL: 0, WARNING: 0, NOTICE: 0, FRESH: 0, NONE: 0 };
}

function summary(
	byTier: Partial<Record<ExpiryTier, number>> = {},
): InventoryExpirySummary {
	const items = { ...emptyByTier(), ...byTier };
	const total = Object.values(items).reduce((a, b) => a + b, 0);
	return {
		generatedAt: "2026-07-27T00:00:00.000Z",
		tiers: ["EXPIRED", "CRITICAL", "WARNING", "NOTICE", "FRESH", "NONE"],
		thresholdDays: { critical: 30, warning: 90, notice: 180 },
		batches: { total, byTier: items },
		items: { total, byTier: items },
		recalledBatches: 0,
		recalledItems: 0,
		inactiveItems: 0,
	};
}

function resolveWith(items: InventoryListItem[]) {
	mockedList.mockResolvedValue({
		items,
		page: 1,
		pageSize: 20,
		total: items.length,
	});
}

describe("InventoryList expiry tiers", () => {
	beforeEach(() => {
		mockedList.mockReset();
		mockedSummary.mockReset().mockResolvedValue(summary());
	});

	it("renders the tier label the server sent for each row", async () => {
		// Neutral product names so they cannot collide with the tier labels.
		resolveWith([
			item({ productId: "p1", productName: "SP-A", expiryTier: "EXPIRED" }),
			item({ productId: "p2", productName: "SP-B", expiryTier: "CRITICAL" }),
			item({ productId: "p3", productName: "SP-C", expiryTier: "WARNING" }),
			item({ productId: "p4", productName: "SP-D", expiryTier: "NOTICE" }),
			item({ productId: "p5", productName: "SP-E", expiryTier: "FRESH" }),
			item({ productId: "p6", productName: "SP-F", expiryTier: "NONE" }),
		]);

		render(<InventoryList />);
		await screen.findByRole("link", { name: /SP-C/ });

		// Scope to each card: the same labels also appear in tiles and filter options.
		const labelInRow = (name: RegExp) =>
			within(screen.getByRole("link", { name })).getByText(
				/Đã hết hạn|Còn dưới|Còn hạn|Không HSD/,
			).textContent;

		expect(labelInRow(/SP-A/)).toBe("Đã hết hạn");
		expect(labelInRow(/SP-B/)).toBe("Còn dưới 30 ngày");
		expect(labelInRow(/SP-C/)).toBe("Còn dưới 90 ngày");
		expect(labelInRow(/SP-D/)).toBe("Còn dưới 180 ngày");
		expect(labelInRow(/SP-E/)).toBe("Còn hạn");
		expect(labelInRow(/SP-F/)).toBe("Không HSD");
	});

	it("does not recompute tiers in the browser from nextExpiry", async () => {
		// A date far in the future that the server nonetheless flagged CRITICAL.
		resolveWith([
			item({
				productName: "Lô đặc biệt",
				expiryTier: "CRITICAL",
				nextExpiry: "2099-12-31T00:00:00.000Z",
			}),
		]);

		render(<InventoryList />);
		const row = await screen.findByRole("link", { name: /Lô đặc biệt/ });

		expect(within(row).getByText("Còn dưới 30 ngày")).toBeInTheDocument();
		expect(within(row).queryByText("Còn hạn")).not.toBeInTheDocument();
	});

	it("counts the critical/expired tiles from the tenant-wide summary, not the current page", async () => {
		// Current page only has 1 CRITICAL and 0 EXPIRED rows...
		resolveWith([
			item({ productId: "p1", expiryTier: "CRITICAL" }),
			item({ productId: "p2", expiryTier: "FRESH" }),
		]);
		// ...but the tenant-wide summary reports more across every page.
		mockedSummary.mockResolvedValue(summary({ CRITICAL: 7, EXPIRED: 3 }));

		render(<InventoryList />);

		const critical = await screen.findByRole("button", {
			name: /Còn dưới 30 ngày/,
		});
		expect(critical).toHaveTextContent("7");
		expect(
			screen.getByRole("button", { name: /Đã hết hạn/ }),
		).toHaveTextContent("3");
	});

	it("shows a loading placeholder for the expiry tiles while the summary is pending", async () => {
		resolveWith([item({ productId: "p1", expiryTier: "FRESH" })]);
		let resolveSummary!: (value: InventoryExpirySummary) => void;
		mockedSummary.mockReturnValue(
			new Promise((resolve) => {
				resolveSummary = resolve;
			}),
		);

		render(<InventoryList />);
		await screen.findByText("SKU-1");

		expect(
			screen.queryByRole("button", { name: /Còn dưới 30 ngày/ }),
		).not.toBeInTheDocument();
		expect(
			screen.queryByRole("button", { name: /Đã hết hạn/ }),
		).not.toBeInTheDocument();

		resolveSummary(summary({ CRITICAL: 1 }));
		expect(
			await screen.findByRole("button", { name: /Còn dưới 30 ngày/ }),
		).toHaveTextContent("1");
	});

	it("shows a retry action for the expiry tiles when the summary request fails", async () => {
		resolveWith([item({ productId: "p1", expiryTier: "FRESH" })]);
		mockedSummary.mockRejectedValueOnce(
			new Error("Không thể tải cảnh báo hạn sử dụng"),
		);

		render(<InventoryList />);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Không thể tải cảnh báo hạn sử dụng",
		);
		expect(
			screen.queryByRole("button", { name: /Còn dưới 30 ngày/ }),
		).not.toBeInTheDocument();

		mockedSummary.mockResolvedValueOnce(summary({ EXPIRED: 2 }));
		fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));

		expect(
			await screen.findByRole("button", { name: /Đã hết hạn/ }),
		).toHaveTextContent("2");
		await waitFor(() => expect(mockedSummary).toHaveBeenCalledTimes(2));
	});

	it("filters the rows down to one tier when its tile is clicked", async () => {
		resolveWith([
			item({
				productId: "p1",
				productName: "Lô hết hạn",
				expiryTier: "EXPIRED",
			}),
			item({ productId: "p2", productName: "Lô còn hạn", expiryTier: "FRESH" }),
		]);

		render(<InventoryList />);
		await screen.findByText("Lô hết hạn");
		expect(screen.getByText("Lô còn hạn")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: /Đã hết hạn/ }));

		expect(screen.getByText("Lô hết hạn")).toBeInTheDocument();
		expect(screen.queryByText("Lô còn hạn")).not.toBeInTheDocument();
	});

	it("shows the empty state when a tier filter matches nothing", async () => {
		resolveWith([item({ productId: "p1", expiryTier: "FRESH" })]);

		render(<InventoryList />);
		await screen.findByText("Còn hạn");

		fireEvent.click(screen.getByRole("button", { name: /Đã hết hạn/ }));

		expect(screen.getByText("Chưa có dữ liệu tồn kho")).toBeInTheDocument();
	});
});
