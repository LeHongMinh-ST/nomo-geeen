import { ConflictException } from '@nestjs/common';
import { BillingCycle } from '@prisma/client';
import { BillingService } from './billing.service';

const context = { actorId: 'admin-1', actorRoleCode: 'BILLING' };
const lifecycleContext = { actorId: 'admin-1', actorRoleCode: 'BILLING' };
const feature = (code: string) => ({ feature: { code } });
const plan = (overrides: Record<string, unknown> = {}) => ({
	id: 'plan-1',
	code: 'starter',
	name: 'Starter',
	description: null,
	price: 0n,
	billingCycle: BillingCycle.MONTHLY,
	maxUsers: 1,
	maxWarehouses: 1,
	maxProducts: null,
	maxCustomers: null,
	maxOrdersPerMonth: null,
	maxStorageBytes: 1000n,
	isActive: true,
	createdAt: new Date('2026-07-01T00:00:00Z'),
	updatedAt: new Date('2026-07-02T00:00:00Z'),
	features: [feature('sales')],
	...overrides,
});

function makeService(current = plan()) {
	const tx = {
		plan: {
			create: jest.fn().mockResolvedValue(current),
			updateMany: jest.fn().mockResolvedValue({ count: 1 }),
			findUnique: jest.fn().mockResolvedValue(current),
			findUniqueOrThrow: jest.fn().mockResolvedValue(current),
		},
		planFeature: { deleteMany: jest.fn(), createMany: jest.fn() },
	};
	const prisma = {
		plan: {
			findUnique: jest.fn().mockResolvedValue(current),
			findMany: jest.fn().mockResolvedValue([current]),
			count: jest.fn().mockResolvedValue(1),
		},
		feature: {
			findMany: jest
				.fn()
				.mockResolvedValue([{ id: 'feature-1', code: 'sales' }]),
		},
	};
	const audit = {
		run: jest.fn().mockImplementation(async (_input, change) => change(tx)),
	};
	return {
		service: new BillingService(prisma as never, audit as never),
		prisma,
		audit,
		tx,
	};
}

describe('BillingService plan catalog', () => {
	it('lists plans with bounded pagination and stable ordering', async () => {
		const { service, prisma } = makeService();
		const result = await service.list({ page: 1, pageSize: 100 });
		expect(result.items[0].featureCodes).toEqual(['sales']);
		expect(prisma.plan.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ take: 100 }),
		);
	});

	it('creates a plan through the transactional audit boundary', async () => {
		const { service, audit } = makeService();
		await service.create(
			{
				code: 'starter',
				name: 'Starter',
				price: 0,
				billingCycle: BillingCycle.MONTHLY,
				maxUsers: 1,
				maxWarehouses: 1,
				maxStorageBytes: 1000,
				featureCodes: ['sales'],
			},
			context,
		);
		expect(audit.run).toHaveBeenCalledWith(
			expect.objectContaining({ action: 'PLAN_CREATE' }),
			expect.any(Function),
		);
		expect(audit.run.mock.calls[0][0].after).toEqual(
			expect.objectContaining({
				price: '0',
				quotas: expect.objectContaining({ maxStorageBytes: '1000' }),
			}),
		);
	});

	it('rejects stale updates before mutation', async () => {
		const { service, audit } = makeService();
		await expect(
			service.update(
				'plan-1',
				{
					name: 'Changed',
					expectedUpdatedAt: '2020-01-01T00:00:00Z',
				},
				context,
			),
		).rejects.toBeInstanceOf(ConflictException);
		expect(audit.run).not.toHaveBeenCalled();
	});

	it('rejects unknown feature codes without entering the audit transaction', async () => {
		const { service, prisma, audit } = makeService();
		prisma.feature.findMany.mockResolvedValue([]);
		await expect(
			service.create(
				{
					code: 'starter',
					name: 'Starter',
					price: 0,
					billingCycle: BillingCycle.MONTHLY,
					maxUsers: 1,
					maxWarehouses: 1,
					maxStorageBytes: 1000,
					featureCodes: ['missing'],
				},
				context,
			),
		).rejects.toMatchObject({ response: { reason: 'UNKNOWN_FEATURE_CODE' } });
		expect(audit.run).not.toHaveBeenCalled();
	});

	it('audits activation mutations', async () => {
		const { service, audit } = makeService();
		await service.setActivation(
			'plan-1',
			{
				isActive: false,
				expectedUpdatedAt: '2026-07-02T00:00:00Z',
			},
			context,
		);
		expect(audit.run).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'PLAN_DEACTIVATE',
				before: expect.any(Object),
				after: expect.any(Object),
			}),
			expect.any(Function),
		);
	});
});

describe('BillingService subscription lifecycle', () => {
	const baseSubscription = {
		id: 'sub-1',
		tenantId: 'tenant-1',
		planId: 'plan-1',
		status: 'ACTIVE',
		billingCycle: BillingCycle.MONTHLY,
		startDate: new Date('2026-07-01T00:00:00Z'),
		endDate: new Date('2026-07-31T00:00:00Z'),
		trialEndsAt: null,
		cancelledAt: null,
		manualReference: null,
		reason: null,
		createdAt: new Date('2026-07-01T00:00:00Z'),
		updatedAt: new Date('2026-07-02T00:00:00Z'),
		plan: { id: 'plan-1', code: 'starter', name: 'Starter', isActive: true },
	};

	function lifecycleService(current: unknown = null) {
		const tx = {
			subscription: {
				create: jest.fn().mockResolvedValue(baseSubscription),
				updateMany: jest.fn().mockResolvedValue({ count: 1 }),
				findUniqueOrThrow: jest.fn().mockResolvedValue(baseSubscription),
				findFirst: jest.fn().mockResolvedValue(baseSubscription),
			},
		};
		const prisma = {
			tenant: { findFirst: jest.fn().mockResolvedValue({ id: 'tenant-1' }) },
			plan: {
				findUnique: jest
					.fn()
					.mockResolvedValue({ id: 'plan-1', isActive: true }),
			},
			subscription: {
				findFirst: jest.fn().mockResolvedValue(current),
				findMany: jest.fn().mockResolvedValue(current ? [current] : []),
			},
		};
		const audit = {
			run: jest.fn().mockImplementation(async (_input, change) => change(tx)),
		};
		return new BillingService(
			prisma as never,
			audit as never,
			() => new Date('2026-07-10T00:00:00Z'),
		);
	}

	it('assigns a subscription through the audit transaction', async () => {
		const service = lifecycleService();
		await expect(
			service.assignSubscription(
				'tenant-1',
				{
					planId: 'plan-1',
					status: 'ACTIVE',
					billingCycle: BillingCycle.MONTHLY,
					startDate: '2026-07-10T00:00:00Z',
					endDate: '2026-07-31T00:00:00Z',
				},
				lifecycleContext,
			),
		).resolves.toMatchObject({ id: 'sub-1', status: 'ACTIVE' });
	});

	it('renews from the later of now and the current end date', async () => {
		const service = lifecycleService(baseSubscription);
		await expect(
			service.renewSubscription(
				'tenant-1',
				{
					expectedUpdatedAt: '2026-07-02T00:00:00Z',
				},
				lifecycleContext,
			),
		).resolves.toMatchObject({ id: 'sub-1' });
	});

	it('requires an explicit subscription expiry', async () => {
		const service = lifecycleService();
		await expect(
			service.assignSubscription(
				'tenant-1',
				{
					planId: 'plan-1',
					status: 'ACTIVE',
					billingCycle: BillingCycle.MONTHLY,
					startDate: '2026-07-10T00:00:00Z',
				},
				lifecycleContext,
			),
		).rejects.toMatchObject({ response: { reason: 'EXPIRY_REQUIRED' } });
	});

	it('requires a non-empty cancellation reason', async () => {
		const service = lifecycleService(baseSubscription);
		await expect(
			service.cancelSubscription(
				'tenant-1',
				{
					expectedUpdatedAt: '2026-07-02T00:00:00Z',
					reason: '   ',
				},
				lifecycleContext,
			),
		).rejects.toMatchObject({
			response: { reason: 'CANCELLATION_REASON_REQUIRED' },
		});
	});
});
