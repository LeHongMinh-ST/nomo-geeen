import { SetMetadata } from '@nestjs/common';

export const ENTITLEMENT_FEATURE_KEY = 'entitlement:feature';
export const ENTITLEMENT_QUOTA_KEY = 'entitlement:quota';

export const ENTITLEMENT_DENIAL_REASONS = [
	'NO_SUBSCRIPTION',
	'SUBSCRIPTION_EXPIRED',
	'SUBSCRIPTION_CANCELLED',
	'FEATURE_NOT_INCLUDED',
	'FEATURE_DISABLED',
	'QUOTA_EXCEEDED',
	'ENTITLEMENT_UNAVAILABLE',
] as const;

export type EntitlementDenialReason =
	(typeof ENTITLEMENT_DENIAL_REASONS)[number];

export const QUOTA_DIMENSIONS = [
	'maxUsers',
	'maxWarehouses',
	'maxProducts',
	'maxCustomers',
	'maxOrdersPerMonth',
	'maxStorageBytes',
] as const;

export type QuotaDimension = (typeof QUOTA_DIMENSIONS)[number];
export type QuotaValue = number | bigint;

export interface EffectiveEntitlement {
	tenantId: string;
	subscriptionId: string | null;
	planId: string | null;
	status: 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'NONE';
	isActive: boolean;
	effectiveAt: string;
	expiresAt: string | null;
	featureCodes: string[];
	quotas: Record<QuotaDimension, number | string | null>;
}

export interface EntitlementDenial {
	reason: EntitlementDenialReason;
	featureCode: string | null;
	quota: QuotaDimension | null;
	current: number | string | null;
	requested: number | string | null;
	limit: number | string | null;
}

export interface RequiredQuota {
	dimension: QuotaDimension;
	requested?: QuotaValue;
}

export const RequireFeature = (
	featureCode: string,
): MethodDecorator & ClassDecorator =>
	SetMetadata(ENTITLEMENT_FEATURE_KEY, featureCode);

export const RequireQuota = (
	dimension: QuotaDimension,
	requested = 1,
): MethodDecorator & ClassDecorator =>
	SetMetadata(ENTITLEMENT_QUOTA_KEY, {
		dimension,
		requested,
	} satisfies RequiredQuota);
