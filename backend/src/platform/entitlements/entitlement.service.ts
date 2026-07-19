import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
	type EffectiveEntitlement,
	type EntitlementDenial,
	type EntitlementDenialReason,
	QUOTA_DIMENSIONS,
	type QuotaDimension,
	type QuotaValue,
} from './entitlement.constants';
import { EntitlementDenialException } from './entitlement-denial.exception';

export type EntitlementClock = () => Date;
export const ENTITLEMENT_CLOCK = Symbol('ENTITLEMENT_CLOCK');

type SubscriptionWithPlan = Prisma.SubscriptionGetPayload<{
	include: { plan: { include: { features: { include: { feature: true } } } } };
}>;

const EMPTY_QUOTAS = (): EffectiveEntitlement['quotas'] => ({
	maxUsers: null,
	maxWarehouses: null,
	maxProducts: null,
	maxCustomers: null,
	maxOrdersPerMonth: null,
	maxStorageBytes: null,
});

@Injectable()
export class EntitlementService {
	constructor(
		private readonly prisma: PrismaService,
		@Inject(ENTITLEMENT_CLOCK)
		private readonly clock: EntitlementClock,
	) {}

	async getEffectiveEntitlement(
		tenantId: string,
		client: Prisma.TransactionClient | PrismaService = this.prisma,
	): Promise<EffectiveEntitlement> {
		const now = this.clock();
		let subscription: SubscriptionWithPlan | null;
		try {
			subscription = await client.subscription.findFirst({
				where: {
					tenantId,
					status: { not: 'CANCELLED' },
					cancelledAt: null,
					startDate: { lte: now },
					AND: [
						{ OR: [{ endDate: null }, { endDate: { gt: now } }] },
						{ OR: [{ trialEndsAt: null }, { trialEndsAt: { gt: now } }] },
					],
				},
				orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
				include: {
					plan: {
						include: { features: { include: { feature: true } } },
					},
				},
			});
			if (!subscription) {
				subscription = await client.subscription.findFirst({
					where: { tenantId },
					orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
					include: {
						plan: {
							include: { features: { include: { feature: true } } },
						},
					},
				});
			}
		} catch {
			throw this.unavailable(tenantId);
		}

		if (!subscription) return this.none(tenantId, now);

		const expired = this.isExpired(subscription, now);
		const cancelled =
			subscription.status === 'CANCELLED' || subscription.cancelledAt !== null;
		const active =
			!cancelled &&
			!expired &&
			(subscription.status === 'ACTIVE' ||
				subscription.status === 'TRIALING') &&
			subscription.startDate <= now;
		const status = cancelled
			? 'CANCELLED'
			: expired
				? 'EXPIRED'
				: subscription.status;

		return {
			tenantId,
			subscriptionId: subscription.id,
			planId: subscription.planId,
			status,
			isActive: active,
			effectiveAt: subscription.startDate.toISOString(),
			expiresAt: this.expiry(subscription)?.toISOString() ?? null,
			featureCodes: active
				? subscription.plan.features.map(({ feature }) => feature.code)
				: [],
			quotas: active ? this.planQuotas(subscription) : EMPTY_QUOTAS(),
		};
	}

	async assertFeature(
		tenantId: string,
		featureCode: string,
		client: Prisma.TransactionClient | PrismaService = this.prisma,
	): Promise<EffectiveEntitlement> {
		const entitlement = await this.getEffectiveEntitlement(tenantId, client);
		if (!entitlement.isActive) {
			throw this.denialForState(entitlement);
		}

		let flag: { enabled: boolean } | null;
		try {
			flag = await client.tenantFeatureFlag.findFirst({
				where: { tenantId, feature: { code: featureCode } },
				select: { enabled: true },
			});
		} catch {
			throw this.unavailable(tenantId);
		}
		if (flag?.enabled === false) {
			throw this.denial({ reason: 'FEATURE_DISABLED', featureCode });
		}
		if (
			flag?.enabled !== true &&
			!entitlement.featureCodes.includes(featureCode)
		) {
			throw this.denial({ reason: 'FEATURE_NOT_INCLUDED', featureCode });
		}
		return entitlement;
	}

	async assertQuota(
		tenantId: string,
		dimension: QuotaDimension,
		current: QuotaValue,
		requested: QuotaValue,
		client: Prisma.TransactionClient | PrismaService = this.prisma,
	): Promise<EffectiveEntitlement> {
		if (!QUOTA_DIMENSIONS.includes(dimension)) {
			throw this.denial({ reason: 'QUOTA_EXCEEDED', quota: dimension });
		}
		const entitlement = await this.getEffectiveEntitlement(tenantId, client);
		if (!entitlement.isActive) throw this.denialForState(entitlement);
		const limit = entitlement.quotas[dimension];
		if (
			(this.toComparable(requested) as bigint | number) > 0 &&
			limit !== null &&
			(this.toComparable(current, requested) as bigint | number) >
				(this.toComparable(limit) as bigint | number)
		) {
			throw this.denial({
				reason: 'QUOTA_EXCEEDED',
				quota: dimension,
				current: this.serialise(current),
				requested: this.serialise(requested),
				limit,
			});
		}
		return entitlement;
	}

	async getQuotaUsage(
		tenantId: string,
		dimension: QuotaDimension,
		periodKey = 'lifetime',
		client: Prisma.TransactionClient | PrismaService = this.prisma,
	): Promise<bigint> {
		try {
			const row = await client.tenantQuotaCounter.findUnique({
				where: {
					tenantId_dimension_periodKey: { tenantId, dimension, periodKey },
				},
				select: { used: true },
			});
			return row?.used ?? 0n;
		} catch {
			throw this.unavailable(tenantId);
		}
	}

	private isExpired(subscription: SubscriptionWithPlan, now: Date): boolean {
		const expiry = this.expiry(subscription);
		return expiry !== null && expiry <= now;
	}

	private expiry(subscription: SubscriptionWithPlan): Date | null {
		const dates = [subscription.endDate, subscription.trialEndsAt].filter(
			(date): date is Date => date !== null,
		);
		return dates.length === 0
			? null
			: new Date(Math.min(...dates.map((date) => date.getTime())));
	}

	private planQuotas(
		subscription: SubscriptionWithPlan,
	): EffectiveEntitlement['quotas'] {
		const plan = subscription.plan;
		return {
			maxUsers: plan.maxUsers,
			maxWarehouses: plan.maxWarehouses,
			maxProducts: plan.maxProducts,
			maxCustomers: plan.maxCustomers,
			maxOrdersPerMonth: plan.maxOrdersPerMonth,
			maxStorageBytes: plan.maxStorageBytes.toString(),
		};
	}

	private none(tenantId: string, now: Date): EffectiveEntitlement {
		return {
			tenantId,
			subscriptionId: null,
			planId: null,
			status: 'NONE',
			isActive: false,
			effectiveAt: now.toISOString(),
			expiresAt: null,
			featureCodes: [],
			quotas: EMPTY_QUOTAS(),
		};
	}

	private denialForState(
		entitlement: EffectiveEntitlement,
	): EntitlementDenialException {
		const reason: EntitlementDenialReason =
			entitlement.status === 'CANCELLED'
				? 'SUBSCRIPTION_CANCELLED'
				: entitlement.status === 'EXPIRED'
					? 'SUBSCRIPTION_EXPIRED'
					: 'NO_SUBSCRIPTION';
		return this.denial({ reason });
	}

	private unavailable(tenantId: string): EntitlementDenialException {
		void tenantId;
		return this.denial({ reason: 'ENTITLEMENT_UNAVAILABLE' });
	}

	private denial(
		values: Partial<EntitlementDenial> & { reason: EntitlementDenialReason },
	): EntitlementDenialException {
		return new EntitlementDenialException({
			reason: values.reason,
			featureCode: values.featureCode ?? null,
			quota: values.quota ?? null,
			current: values.current ?? null,
			requested: values.requested ?? null,
			limit: values.limit ?? null,
		});
	}

	private serialise(value: QuotaValue): number | string {
		return typeof value === 'bigint' ? value.toString() : value;
	}

	private toComparable(
		current: QuotaValue | number | string,
		requested?: QuotaValue,
	): bigint | number {
		if (typeof current === 'string') return BigInt(current);
		if (typeof current === 'bigint' || typeof requested === 'bigint') {
			return (
				BigInt(current) + (requested === undefined ? 0n : BigInt(requested))
			);
		}
		return current + (requested ?? 0);
	}
}
