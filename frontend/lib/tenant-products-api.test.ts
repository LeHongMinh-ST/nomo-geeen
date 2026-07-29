import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ tenantId: "tenant-a" }));
const userFetch = vi.hoisted(() => vi.fn());
vi.mock("@/lib/user-fetch", () => ({ userFetch }));
vi.mock("@/stores/user-auth-store", () => ({
	useUserAuth: {
		getState: () => ({
			user: { tenantId: auth.tenantId },
			accessToken: "token",
		}),
	},
}));

import {
	clearTenantProductCache,
	getTenantProductCatalog,
} from "./tenant-products-api";

const products = [
	{
		id: "p1",
		sku: "SKU-1",
		name: "Sản phẩm",
		barcode: null,
		baseUnitId: "u1",
		brandId: null,
		manufacturerId: null,
		costPrice: "1",
		salePrice: "2",
		wholesalePrice: null,
		isLocked: false,
		isRecalled: false,
		status: "ACTIVE",
		stock: "3",
		createdAt: "2026-01-01",
		businessGroup: null,
		productKind: null,
		attrs: null,
	},
];
const lookups = { brands: [], manufacturers: [], units: [] };

describe("tenant product catalog cache", () => {
	beforeEach(() => {
		userFetch.mockReset();
		auth.tenantId = "tenant-a";
		clearTenantProductCache();
		userFetch.mockImplementation((path: string) =>
			Promise.resolve(path.endsWith("/lookups") ? lookups : products),
		);
	});

	it("deduplicates picker GETs within the TTL and isolates tenants", async () => {
		await Promise.all([getTenantProductCatalog(), getTenantProductCatalog()]);
		expect(userFetch).toHaveBeenCalledTimes(2);

		auth.tenantId = "tenant-b";
		await getTenantProductCatalog();
		expect(userFetch).toHaveBeenCalledTimes(4);
	});

	it("does not repopulate after an in-flight request is cleared", async () => {
		const pending: Array<(value: unknown) => void> = [];
		userFetch.mockImplementation(
			() => new Promise((resolve) => pending.push(resolve)),
		);
		const request = getTenantProductCatalog();
		expect(userFetch).toHaveBeenCalledTimes(2);
		clearTenantProductCache();
		pending[0]?.(products);
		pending[1]?.(lookups);
		await request;

		userFetch.mockImplementation((path: string) =>
			Promise.resolve(path.endsWith("/lookups") ? lookups : products),
		);
		await getTenantProductCatalog();
		expect(userFetch).toHaveBeenCalledTimes(4);
	});

	it("can be invalidated after a sale or product mutation", async () => {
		await getTenantProductCatalog();
		clearTenantProductCache();
		await getTenantProductCatalog();
		expect(userFetch).toHaveBeenCalledTimes(4);
	});
});
