import { adminFetch } from "./fetch";

export type BillingCycle = "MONTHLY" | "QUARTERLY" | "YEARLY";

export interface PlanQuotas {
	maxUsers: number;
	maxWarehouses: number;
	maxProducts: number | null;
	maxCustomers: number | null;
	maxOrdersPerMonth: number | null;
	maxStorageBytes: string;
}

export interface PlanResponse {
	id: string;
	code: string;
	name: string;
	description: string | null;
	price: string;
	billingCycle: BillingCycle;
	isActive: boolean;
	quotas: PlanQuotas;
	featureCodes: string[];
	createdAt: string;
	updatedAt: string;
}

export interface ListPlansResult {
	items: PlanResponse[];
	page: number;
	pageSize: number;
	total: number;
}

export interface PlanInput {
	code?: string;
	name: string;
	description?: string | null;
	price: number;
	billingCycle: BillingCycle;
	maxUsers: number;
	maxWarehouses: number;
	maxProducts?: number | null;
	maxCustomers?: number | null;
	maxOrdersPerMonth?: number | null;
	maxStorageBytes: number;
	featureCodes: string[];
}

export interface UpdatePlanInput extends Omit<PlanInput, "code"> {
	expectedUpdatedAt: string;
}

export interface PlanActivationInput {
	isActive: boolean;
	expectedUpdatedAt: string;
}

export function listPlans(accessToken: string, page = 1, pageSize = 100) {
	return adminFetch<ListPlansResult>(
		`/admin/plans?page=${page}&pageSize=${Math.min(pageSize, 100)}`,
		{ accessToken },
	);
}

export function createPlan(accessToken: string, input: PlanInput) {
	return adminFetch<PlanResponse>("/admin/plans", {
		method: "POST",
		accessToken,
		body: JSON.stringify(input),
	});
}

export function updatePlan(
	accessToken: string,
	id: string,
	input: UpdatePlanInput,
) {
	return adminFetch<PlanResponse>(`/admin/plans/${id}`, {
		method: "PATCH",
		accessToken,
		body: JSON.stringify(input),
	});
}

export function setPlanActivation(
	accessToken: string,
	id: string,
	input: PlanActivationInput,
) {
	return adminFetch<PlanResponse>(`/admin/plans/${id}/activation`, {
		method: "POST",
		accessToken,
		body: JSON.stringify(input),
	});
}
