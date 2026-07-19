import { adminFetch } from "./fetch";
import type { BillingCycle } from "./plans";

export type SubscriptionStatus =
	| "ACTIVE"
	| "TRIALING"
	| "CANCELLED"
	| "EXPIRED";

export interface SubscriptionResponse {
	id: string;
	tenantId: string;
	planId: string;
	plan: { id: string; code: string; name: string; isActive: boolean };
	status: SubscriptionStatus;
	billingCycle: BillingCycle;
	startDate: string;
	endDate: string | null;
	trialEndsAt: string | null;
	cancelledAt: string | null;
	manualReference: string | null;
	reason: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface SubscriptionResult {
	current: SubscriptionResponse | null;
	history: SubscriptionResponse[];
	page: number;
	pageSize: number;
	total: number;
}

export interface AssignSubscriptionInput {
	planId: string;
	status: "ACTIVE" | "TRIALING";
	billingCycle: BillingCycle;
	startDate: string;
	endDate?: string | null;
	trialEndsAt?: string | null;
	manualReference?: string | null;
	reason?: string | null;
	expectedUpdatedAt?: string | null;
}

export interface RenewSubscriptionInput {
	billingCycle?: BillingCycle;
	manualReference?: string | null;
	reason?: string | null;
	expectedUpdatedAt: string;
}

export interface CancelSubscriptionInput {
	reason: string;
	expectedUpdatedAt: string;
}

export function getSubscription(
	accessToken: string,
	tenantId: string,
	page = 1,
	pageSize = 20,
) {
	return adminFetch<SubscriptionResult>(
		`/admin/tenants/${tenantId}/subscription?page=${page}&pageSize=${Math.min(pageSize, 100)}`,
		{ accessToken },
	);
}

export function assignSubscription(
	accessToken: string,
	tenantId: string,
	input: AssignSubscriptionInput,
) {
	return adminFetch<SubscriptionResponse>(
		`/admin/tenants/${tenantId}/subscription`,
		{ method: "POST", accessToken, body: JSON.stringify(input) },
	);
}

export function renewSubscription(
	accessToken: string,
	tenantId: string,
	input: RenewSubscriptionInput,
) {
	return adminFetch<SubscriptionResponse>(
		`/admin/tenants/${tenantId}/subscription/renew`,
		{ method: "POST", accessToken, body: JSON.stringify(input) },
	);
}

export function cancelSubscription(
	accessToken: string,
	tenantId: string,
	input: CancelSubscriptionInput,
) {
	return adminFetch<SubscriptionResponse>(
		`/admin/tenants/${tenantId}/subscription/cancel`,
		{ method: "POST", accessToken, body: JSON.stringify(input) },
	);
}
