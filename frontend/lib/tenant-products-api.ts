import type { Product } from "@/lib/products";
import type {
	BusinessGroupId,
	ProductKindId,
	TenantBusinessGroup,
} from "@/lib/product-kind-form";
import { userFetch } from "@/lib/user-fetch";

export type TenantProduct = {
	id: string;
	sku: string;
	name: string;
	barcode: string | null;
	baseUnitId: string;
	categoryId: string | null;
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
	categories: Array<{ id: string; name: string }>;
	brands: Array<{ id: string; name: string }>;
	manufacturers: Array<{ id: string; name: string }>;
	units: Array<{ id: string; code: string; name: string }>;
};

export type ProductInput = {
	sku: string;
	name: string;
	barcode?: string;
	baseUnitId: string;
	categoryId?: string;
	brandId?: string;
	manufacturerId?: string;
	costPrice?: number;
	salePrice?: number;
	wholesalePrice?: number;
	isLocked?: boolean;
	businessGroup?: BusinessGroupId;
	productKind?: ProductKindId;
	attrs?: Record<string, unknown>;
};

export function mapTenantProduct(
	row: TenantProduct,
	lookups: ProductLookups,
): Product {
	const category = lookups.categories.find(
		(item) => item.id === row.categoryId,
	);
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
		categoryId: row.categoryId ?? "",
		categoryLabel: category?.name,
		brandId: row.brandId ?? undefined,
		brandLabel: brand?.name,
		manufacturerId: row.manufacturerId ?? undefined,
		manufacturerLabel: manufacturer?.name,
		baseUnit: unit?.name ?? "—",
		baseUnitId: row.baseUnitId,
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

export function getTenantBusinessGroups(): Promise<{
	configured: boolean;
	groups: TenantBusinessGroup[];
}> {
	return userFetch(`${base}/business-groups`);
}

export function createTenantProduct(
	input: ProductInput,
): Promise<TenantProduct> {
	return userFetch<TenantProduct>(base, {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export function updateTenantProduct(
	id: string,
	input: Partial<ProductInput>,
): Promise<TenantProduct> {
	return userFetch<TenantProduct>(`${base}/${id}`, {
		method: "PATCH",
		body: JSON.stringify(input),
	});
}

export function deleteTenantProduct(
	id: string,
): Promise<{ id: string; deleted: boolean }> {
	return userFetch<{ id: string; deleted: boolean }>(`${base}/${id}`, {
		method: "DELETE",
	});
}
