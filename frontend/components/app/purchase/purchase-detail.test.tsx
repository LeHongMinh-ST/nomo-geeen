import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { PurchaseDetail } from "./purchase-detail";

const { getTenantPurchase, routerPush } = vi.hoisted(() => ({
	getTenantPurchase: vi.fn(),
	routerPush: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: routerPush }),
}));
vi.mock("next/link", () => ({
	default: ({ children, href }: { children: ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));
vi.mock("@/lib/tenant-purchases-api", () => ({
	cancelTenantPurchase: vi.fn(),
	completeTenantPurchase: vi.fn(),
	getTenantPurchase,
	mapTenantPurchase: (value: unknown) => value,
}));

describe("PurchaseDetail conversion and lot price", () => {
	it("renders a natural Vietnamese conversion and the supplied lot sale price", async () => {
		getTenantPurchase.mockResolvedValue({
			id: "purchase-1",
			code: "PN-0001",
			supplierId: "supplier-1",
			supplierName: "Nhà cung cấp test",
			lines: [
				{
					productId: "product-1",
					name: "Phân bón test",
					unit: "Bao",
					factor: 40,
					qty: 2,
					cost: 180_000,
					salePrice: 250_000,
					batch: "LOT-01",
				},
			],
			discount: 0,
			shipping: 0,
			status: "completed",
			payment: "cash",
			createdAt: "2026-07-31",
		});

		render(<PurchaseDetail purchaseId="purchase-1" />);

		await waitFor(() =>
			expect(screen.getByText("PN-0001")).toBeInTheDocument(),
		);
		const line = screen.getByText((content) =>
			content.includes("Giá bán theo lô: 250.000₫/Bao"),
		);
		expect(line).toHaveTextContent(
			"2 Bao × 180.000₫/Bao · quy đổi 80 đơn vị gốc · Giá bán theo lô: 250.000₫/Bao",
		);
		expect(line.textContent).not.toContain("`");
		expect(line.textContent).not.toContain("$");
	});
});
