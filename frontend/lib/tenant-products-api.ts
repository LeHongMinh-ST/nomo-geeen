import type {
	BusinessGroupId,
	ProductKindId,
	TenantBusinessGroup,
} from "@/lib/product-kind-form";
import type { Product } from "@/lib/products";
import { userFetch } from "@/lib/user-fetch";
import { useUserAuth } from "@/stores/user-auth-store";

export type TenantProduct = {
	id: string;
	sku: string;
	name: string;
	barcode: string | null;
	baseUnitId: string | null;
	brandId: string | null;
	manufacturerId: string | null;
	costPrice: string;
	salePrice: string;
	wholesalePrice: string | null;
	isLocked: boolean;
	isRecalled: boolean;
	status: string;
	stock: string;
	createdAt: string;
	updatedAt?: string;
	businessGroup: string | null;
	productKind: string | null;
	attrs: Record<string, unknown> | null;
	domain?: string | null;
	conversions?: Array<{
		unitId: string;
		factor: number;
		kind: "PURCHASE" | "BOTH";
		unit: string;
	}>;
};

export type ProductLookups = {
	brands: Array<{ id: string; name: string }>;
	manufacturers: Array<{ id: string; name: string }>;
	units: Array<{ id: string; code: string; name: string }>;
};

export type ProductInput = {
	sku?: string;
	name: string;
	barcode?: string;
	baseUnitId?: string;
	brandId?: string;
	manufacturerId?: string;
	brandName?: string;
	manufacturerName?: string;
	costPrice?: number;
	salePrice?: number;
	wholesalePrice?: number;
	isLocked?: boolean;
	businessGroup?: BusinessGroupId;
	productKind?: ProductKindId;
	attrs?: Record<string, unknown>;
	conversions?: Array<{
		unitId: string;
		factor: number;
		kind?: "PURCHASE" | "BOTH";
	}>;
};

export function mapTenantProduct(
	row: TenantProduct,
	lookups: ProductLookups,
): Product {
	const brand = lookups.brands.find((item) => item.id === row.brandId);
	const manufacturer = lookups.manufacturers.find(
		(item) => item.id === row.manufacturerId,
	);
	const unit = lookups.units.find((item) => item.id === row.baseUnitId);
	return {
		id: row.id,
		name: row.name,
		sku: row.sku,
		barcode: row.barcode ?? undefined,
		brandId: row.brandId ?? undefined,
		brandLabel: brand?.name,
		manufacturerId: row.manufacturerId ?? undefined,
		manufacturerLabel: manufacturer?.name,
		baseUnit: unit?.name ?? "—",
		baseUnitId: row.baseUnitId ?? undefined,
		conversions: (row.conversions ?? []).map((conversion) => ({
			unitId: conversion.unitId,
			factor: conversion.factor,
			kind: conversion.kind,
			unit: conversion.unit,
		})),
		costPrice: Number(row.costPrice),
		salePrice: Number(row.salePrice),
		wholesalePrice: row.wholesalePrice ? Number(row.wholesalePrice) : undefined,
		priceTiers: [],
		stock: Number(row.stock),
		lowStockThreshold: 0,
		locked: row.isLocked,
		recalled: row.isRecalled,
		status: row.status.toLowerCase() === "active" ? "active" : "inactive",
		businessGroup: row.businessGroup as BusinessGroupId | undefined,
		productKind: row.productKind as ProductKindId | undefined,
		attrs: row.attrs ?? undefined,
		domain: row.domain ?? undefined,
	};
}

const PRODUCT_CACHE_TTL_MS = 30_000;
const PRODUCT_CACHE_MAX_STALE_MS = 5 * 60_000;
type ProductCatalog = { products: TenantProduct[]; lookups: ProductLookups };
type ProductCacheEntry = {
	value: ProductCatalog;
	expiresAt: number;
	staleUntil: number;
	refresh?: Promise<ProductCatalog>;
};
const productCache = new Map<string, ProductCacheEntry>();
const productCacheEpochs = new Map<string, number>();

function productCacheEpoch(key: string): number {
	return productCacheEpochs.get(key) ?? 0;
}

function storeProductCatalog(
	key: string,
	epoch: number,
	value: ProductCatalog,
): void {
	if (productCacheEpoch(key) !== epoch) return;
	productCache.set(key, {
		value,
		expiresAt: Date.now() + PRODUCT_CACHE_TTL_MS,
		staleUntil: Date.now() + PRODUCT_CACHE_MAX_STALE_MS,
	});
}

function productCacheKey(): string {
	const auth = useUserAuth.getState();
	return auth.user?.tenantId ?? auth.accessToken ?? "anonymous";
}

async function fetchProductCatalog(): Promise<ProductCatalog> {
	const [products, lookups] = await Promise.all([
		listTenantProducts(),
		getProductLookups(),
	]);
	return { products, lookups };
}

export function clearTenantProductCache(): void {
	const key = productCacheKey();
	productCacheEpochs.set(key, productCacheEpoch(key) + 1);
	productCache.delete(key);
}

/** Short TTL cache for picker data; stale entries render immediately and refresh once in background. */
export function getTenantProductCatalog(): Promise<ProductCatalog> {
	const key = productCacheKey();
	const epoch = productCacheEpoch(key);
	const now = Date.now();
	const cached = productCache.get(key);
	if (cached && cached.expiresAt > now) return Promise.resolve(cached.value);
	if (cached && cached.staleUntil > now) {
		if (!cached.refresh) {
			const refresh = fetchProductCatalog()
				.then((value) => {
					storeProductCatalog(key, epoch, value);
					return value;
				})
				.catch(() => cached.value)
				.finally(() => {
					const current = productCache.get(key);
					if (current?.refresh === refresh) current.refresh = undefined;
				});
			cached.refresh = refresh;
		}
		return Promise.resolve(cached.value);
	}
	const refresh = cached?.refresh ?? fetchProductCatalog();
	productCache.set(key, {
		value: cached?.value ?? {
			products: [],
			lookups: { brands: [], manufacturers: [], units: [] },
		},
		expiresAt: 0,
		staleUntil: 0,
		refresh,
	});
	return refresh.then((value) => {
		storeProductCatalog(key, epoch, value);
		return value;
	});
}

const base = "/tenant/products";

export function listTenantProducts(): Promise<TenantProduct[]> {
	return userFetch<TenantProduct[]>(base);
}

export function getTenantProduct(id: string): Promise<TenantProduct> {
	return userFetch<TenantProduct>(`${base}/${id}`);
}

export function getProductLookups(): Promise<ProductLookups> {
	return userFetch<ProductLookups>(`${base}/lookups`);
}

export type BusinessGroupSettings = {
	configured: boolean;
	groups: TenantBusinessGroup[];
	/** Số sản phẩm ACTIVE theo từng nhóm, khóa là BusinessGroupId. */
	productCounts?: Record<string, number>;
};

export function getTenantBusinessGroups(): Promise<BusinessGroupSettings> {
	return userFetch(`${base}/business-groups`);
}

export function updateTenantBusinessGroups(
	enabledGroups: BusinessGroupId[],
): Promise<BusinessGroupSettings> {
	return userFetch(`${base}/business-groups`, {
		method: "PATCH",
		body: JSON.stringify({ enabledGroups }),
	});
}

export function createTenantProduct(
	input: ProductInput,
): Promise<TenantProduct> {
	return userFetch<TenantProduct>(base, {
		method: "POST",
		body: JSON.stringify(input),
	}).then((result) => {
		clearTenantProductCache();
		return result;
	});
}

export function updateTenantProduct(
	id: string,
	input: Partial<ProductInput>,
): Promise<TenantProduct> {
	return userFetch<TenantProduct>(`${base}/${id}`, {
		method: "PATCH",
		body: JSON.stringify(input),
	}).then((result) => {
		clearTenantProductCache();
		return result;
	});
}

export function deleteTenantProduct(
	id: string,
): Promise<{ id: string; deleted: boolean }> {
	return userFetch<{ id: string; deleted: boolean }>(`${base}/${id}`, {
		method: "DELETE",
	}).then((result) => {
		clearTenantProductCache();
		return result;
	});
}
