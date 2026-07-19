import { EntitlementService } from './entitlement.service';

const now = new Date('2026-07-19T00:00:00.000Z');

function row(overrides: Record<string, unknown> = {}) {
	return {
		id: 'sub-1',
		tenantId: 'tenant-1',
		planId: 'plan-1',
		status: 'ACTIVE',
		startDate: new Date('2026-07-01T00:00:00.000Z'),
		endDate: null,
		trialEndsAt: null,
		cancelledAt: null,
		updatedAt: new Date('2026-07-02T00:00:00.000Z'),
		plan: {
			maxUsers: 5,
			maxWarehouses: 2,
			maxProducts: 10,
			maxCustomers: null,
			maxOrdersPerMonth: 100,
			maxStorageBytes: 1000n,
			features: [{ feature: { code: 'sales' } }],
		},
		...overrides,
	};
}

function service(subscription: unknown = row(), flag: unknown = null) {
	const prisma = {
		subscription: { findFirst: jest.fn().mockResolvedValue(subscription) },
		tenantFeatureFlag: { findFirst: jest.fn().mockResolvedValue(flag) },
	} as never;
	return new EntitlementService(prisma, () => now);
}

function serviceWithSubscriptions(...subscriptions: unknown[]) {
	const prisma = {
		subscription: {
			findFirst: jest
				.fn()
				.mockImplementation(async () => subscriptions.shift() ?? null),
		},
		tenantFeatureFlag: { findFirst: jest.fn().mockResolvedValue(null) },
	} as never;
	return new EntitlementService(prisma, () => now);
}

describe('EntitlementService', () => {
	it('returns the canonical active entitlement and all quota dimensions', async () => {
		const entitlement = await service().getEffectiveEntitlement('tenant-1');

		expect(entitlement).toMatchObject({
			tenantId: 'tenant-1',
			subscriptionId: 'sub-1',
			status: 'ACTIVE',
			isActive: true,
			featureCodes: ['sales'],
			quotas: {
				maxUsers: 5,
				maxWarehouses: 2,
				maxProducts: 10,
				maxCustomers: null,
				maxOrdersPerMonth: 100,
				maxStorageBytes: '1000',
			},
		});
	});

	it.each([
		['expired', { endDate: new Date('2026-07-18T23:59:59.999Z') }, 'EXPIRED'],
		['cancelled', { status: 'CANCELLED', cancelledAt: now }, 'CANCELLED'],
	])(
		'denies %s subscriptions with a stable reason',
		async (_name, changes, status) => {
			const instance = service(row(changes));
			await expect(
				instance.assertFeature('tenant-1', 'sales'),
			).rejects.toMatchObject({
				denial: {
					reason:
						status === 'EXPIRED'
							? 'SUBSCRIPTION_EXPIRED'
							: 'SUBSCRIPTION_CANCELLED',
				},
			});
		},
	);

	it('treats a disabled flag as an explicit deny and an enabled flag as a grant', async () => {
		await expect(
			service(row(), { enabled: false }).assertFeature('tenant-1', 'sales'),
		).rejects.toMatchObject({ denial: { reason: 'FEATURE_DISABLED' } });
		await expect(
			service(row(), { enabled: true }).assertFeature(
				'tenant-1',
				'not-in-plan',
			),
		).resolves.toMatchObject({ isActive: true });
	});

	it('denies a missing feature when no override exists', async () => {
		await expect(
			service().assertFeature('tenant-1', 'missing'),
		).rejects.toMatchObject({
			denial: { reason: 'FEATURE_NOT_INCLUDED', featureCode: 'missing' },
		});
	});

	it('does not let a newer cancelled row hide the latest non-cancelled row', async () => {
		const instance = serviceWithSubscriptions(null, row());
		await expect(
			instance.getEffectiveEntitlement('tenant-1'),
		).resolves.toMatchObject({
			status: 'ACTIVE',
			isActive: true,
		});
	});

	it('queries only date-valid rows before falling back to a denial state', async () => {
		const findFirst = jest
			.fn()
			.mockResolvedValueOnce(null)
			.mockResolvedValueOnce(
				row({ endDate: new Date('2026-07-18T00:00:00.000Z') }),
			);
		const prisma = {
			subscription: { findFirst },
			tenantFeatureFlag: { findFirst: jest.fn() },
		} as never;
		const instance = new EntitlementService(prisma, () => now);

		await expect(
			instance.getEffectiveEntitlement('tenant-1'),
		).resolves.toMatchObject({
			status: 'EXPIRED',
			isActive: false,
		});
		expect(findFirst.mock.calls[0][0].where.startDate).toEqual({ lte: now });
	});

	it('allows unlimited nullable quotas and rejects finite overflow', async () => {
		const instance = service();
		await expect(
			instance.assertQuota('tenant-1', 'maxCustomers', 900, 900),
		).resolves.toBeDefined();
		await expect(
			instance.assertQuota('tenant-1', 'maxUsers', 5, 1),
		).rejects.toMatchObject({
			denial: {
				reason: 'QUOTA_EXCEEDED',
				quota: 'maxUsers',
				current: 5,
				requested: 1,
				limit: 5,
			},
		});
	});

	it('preserves downgrade overage by denying only growth', async () => {
		const instance = service(row({ plan: { ...row().plan, maxUsers: 2 } }));
		await expect(
			instance.assertQuota('tenant-1', 'maxUsers', 3, 0),
		).resolves.toBeDefined();
		await expect(
			instance.assertQuota('tenant-1', 'maxUsers', 3, 1),
		).rejects.toMatchObject({
			denial: { reason: 'QUOTA_EXCEEDED' },
		});
	});

	it('fails closed when entitlement lookup is unavailable', async () => {
		const prisma = {
			subscription: {
				findFirst: jest.fn().mockRejectedValue(new Error('db down')),
			},
			tenantFeatureFlag: { findFirst: jest.fn() },
		} as never;
		const instance = new EntitlementService(prisma, () => now);
		await expect(
			instance.assertFeature('tenant-1', 'sales'),
		).rejects.toMatchObject({
			status: 403,
			denial: { reason: 'ENTITLEMENT_UNAVAILABLE' },
		});
	});
});
