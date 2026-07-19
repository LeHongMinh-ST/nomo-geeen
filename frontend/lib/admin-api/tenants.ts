// API client — platform tenant management.
// Matches backend/src/platform/tenants/tenants.controller.ts

import { adminFetch } from "./fetch";

export type TenantType =
	| "HOUSEHOLD"
	| "RETAIL_DEALER"
	| "COOPERATIVE"
	| "DISTRIBUTOR"
	| "FARM";

export type TenantMode = "SIMPLE" | "ADVANCED";
export type TenantStatus = "ACTIVE" | "SUSPENDED" | "LOCKED";

export interface TenantListItem {
	id: string;
	slug: string;
	name: string;
	tenantType: TenantType;
	mode: TenantMode;
	status: TenantStatus;
	logoUrl: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface TenantDetail extends TenantListItem {
	counts: {
		users: number;
		subscriptions: number;
		openTickets: number;
	};
	quotaUsage: {
		users: number;
		warehouses: number;
		products: number;
		customers: number;
		ordersThisMonth: number;
		storageBytes: string;
	};
}

export interface ListTenantsResult {
	items: TenantListItem[];
	page: number;
	pageSize: number;
	total: number;
}

export interface ListTenantsQuery {
	q?: string;
	status?: TenantStatus | "";
	page?: number;
	pageSize?: number;
}

export interface UpdateTenantInput {
	name?: string;
	tenantType?: TenantType;
	mode?: TenantMode;
	logoUrl?: string | null;
	expectedUpdatedAt: string;
}

export interface TransitionTenantInput {
	status: TenantStatus;
	reason?: string | null;
}

function toQuery(params: ListTenantsQuery): string {
	const sp = new URLSearchParams();
	if (params.q) sp.set("q", params.q.slice(0, 100));
	if (params.status) sp.set("status", params.status);
	sp.set("page", String(params.page ?? 1));
	sp.set("pageSize", String(params.pageSize ?? 20));
	return sp.toString();
}

export async function listTenants(
	accessToken: string,
	params: ListTenantsQuery = {},
): Promise<ListTenantsResult> {
	return adminFetch<ListTenantsResult>(`/admin/tenants?${toQuery(params)}`, {
		accessToken,
	});
}

export async function getTenant(
	accessToken: string,
	id: string,
): Promise<TenantDetail> {
	return adminFetch<TenantDetail>(`/admin/tenants/${id}`, { accessToken });
}

export async function updateTenant(
	accessToken: string,
	id: string,
	input: UpdateTenantInput,
): Promise<TenantDetail> {
	return adminFetch<TenantDetail>(`/admin/tenants/${id}`, {
		method: "PATCH",
		accessToken,
		body: JSON.stringify(input),
	});
}

export async function transitionTenant(
	accessToken: string,
	id: string,
	input: TransitionTenantInput,
): Promise<TenantDetail> {
	return adminFetch<TenantDetail>(`/admin/tenants/${id}/status`, {
		method: "POST",
		accessToken,
		body: JSON.stringify(input),
	});
}

export async function exportTenantsCsv(
	accessToken: string,
	params: ListTenantsQuery = {},
): Promise<string> {
	return adminFetch<string>(`/admin/tenants/export?${toQuery(params)}`, {
		accessToken,
	});
}
