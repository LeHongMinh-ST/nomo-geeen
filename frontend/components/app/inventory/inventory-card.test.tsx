import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ExpiryTier, InventoryListItem } from "@/lib/tenant-inventory-api";
import { InventoryCard } from "./inventory-card";

vi.mock("next/link", () => ({
	default: ({
		children,
		href,
	}: {
		children: React.ReactNode;
		href: string;
	}) => <a href={href}>{children}</a>,
}));

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

describe("InventoryCard", () => {
	const labels: Array<[ExpiryTier, string]> = [
		["EXPIRED", "Đã hết hạn"],
		["CRITICAL", "Còn dưới 30 ngày"],
		["WARNING", "Còn dưới 90 ngày"],
		["NOTICE", "Còn dưới 180 ngày"],
		["FRESH", "Còn hạn"],
		["NONE", "Không HSD"],
	];

	it.each(labels)("renders the Vietnamese label for tier %s", (tier, label) => {
		render(<InventoryCard item={item({ expiryTier: tier })} />);
		expect(screen.getByText(label)).toBeInTheDocument();
	});

	it("renders the tier the server sent without recomputing from the date", () => {
		// Expiry is years out, but the server classified it CRITICAL — trust the server.
		render(
			<InventoryCard
				item={item({
					expiryTier: "CRITICAL",
					nextExpiry: "2099-01-01T00:00:00.000Z",
				})}
			/>,
		);
		expect(screen.getByText("Còn dưới 30 ngày")).toBeInTheDocument();
		expect(screen.queryByText("Còn hạn")).not.toBeInTheDocument();
	});

	it("shows the nearest expiry date only when there is one", () => {
		const { rerender } = render(
			<InventoryCard
				item={item({
					expiryTier: "WARNING",
					nextExpiry: "2026-09-15T00:00:00.000Z",
				})}
			/>,
		);
		expect(screen.getByText(/HSD gần nhất/)).toBeInTheDocument();

		rerender(<InventoryCard item={item({ expiryTier: "NONE" })} />);
		expect(screen.queryByText(/HSD gần nhất/)).not.toBeInTheDocument();
	});

	it("uses the error badge for expired and the success badge for fresh", () => {
		const { rerender } = render(
			<InventoryCard item={item({ expiryTier: "EXPIRED" })} />,
		);
		expect(screen.getByText("Đã hết hạn").className).toContain("#c62828");

		rerender(<InventoryCard item={item({ expiryTier: "FRESH" })} />);
		expect(screen.getByText("Còn hạn").className).toContain("#2e7d32");
	});

	it("derives the stock badge from quantity", () => {
		const { rerender } = render(<InventoryCard item={item({ qty: "0" })} />);
		expect(screen.getByText("Hết hàng")).toBeInTheDocument();

		rerender(<InventoryCard item={item({ qty: "5" })} />);
		expect(screen.getByText("Sắp hết")).toBeInTheDocument();

		rerender(<InventoryCard item={item({ qty: "50" })} />);
		expect(screen.getByText("Còn hàng")).toBeInTheDocument();
	});

	it("links to the product detail page", () => {
		render(<InventoryCard item={item()} />);
		expect(screen.getByRole("link")).toHaveAttribute("href", "/ton-kho/p1");
	});
});
