import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { QuotaDimension } from './entitlement.constants';
import { EntitlementService } from './entitlement.service';
import { EntitlementDenialException } from './entitlement-denial.exception';

@Injectable()
export class TenantQuotaCounterService {
	constructor(private readonly entitlements: EntitlementService) {}

	async reserve(
		tx: Prisma.TransactionClient,
		tenantId: string,
		dimension: QuotaDimension,
		requested: bigint,
	): Promise<void> {
		const entitlement = await this.entitlements.getEffectiveEntitlement(
			tenantId,
			tx,
		);
		if (!entitlement.isActive) {
			await this.entitlements.assertQuota(
				tenantId,
				dimension,
				0n,
				requested,
				tx,
			);
		}
		const limit = entitlement.quotas[dimension];
		if (limit === null) return;
		const periodKey =
			dimension === 'maxOrdersPerMonth' ? this.monthKey() : 'lifetime';
		await tx.tenantQuotaCounter.upsert({
			where: {
				tenantId_dimension_periodKey: { tenantId, dimension, periodKey },
			},
			create: { tenantId, dimension, periodKey, used: 0n },
			update: {},
		});
		const result = await tx.tenantQuotaCounter.updateMany({
			where: {
				tenantId,
				dimension,
				periodKey,
				used: { lte: BigInt(limit) - requested },
			},
			data: { used: { increment: requested } },
		});
		if (result.count === 0) {
			throw new EntitlementDenialException({
				reason: 'QUOTA_EXCEEDED',
				featureCode: null,
				quota: dimension,
				current: (
					await this.entitlements.getQuotaUsage(
						tenantId,
						dimension,
						periodKey,
						tx,
					)
				).toString(),
				requested: requested.toString(),
				limit,
			});
		}
	}

	private monthKey(now = new Date()): string {
		return now.toISOString().slice(0, 7);
	}
}
