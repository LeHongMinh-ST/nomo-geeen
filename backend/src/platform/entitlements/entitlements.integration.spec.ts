import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CreateProductDto } from '../products/dto/create-product.dto';
import { ProductsController } from '../products/products.controller';
import { ProductsService } from '../products/products.service';
import {
	ENTITLEMENT_FEATURE_KEY,
	ENTITLEMENT_QUOTA_KEY,
} from './entitlement.constants';
import { EntitlementService } from './entitlement.service';
import { EntitlementDenialException } from './entitlement-denial.exception';
import { EntitlementsGuard } from './entitlements.guard';
import { TenantQuotaCounterService } from './tenant-quota-counter.service';

const entitlement = {
	tenantId: 'tenant-1',
	subscriptionId: 'sub-1',
	planId: 'plan-1',
	status: 'ACTIVE' as const,
	isActive: true,
	effectiveAt: '2026-07-19T00:00:00.000Z',
	expiresAt: null,
	featureCodes: ['inventory'],
	quotas: {
		maxUsers: null,
		maxWarehouses: null,
		maxProducts: 1,
		maxCustomers: null,
		maxOrdersPerMonth: null,
		maxStorageBytes: null,
	},
};

function context(request: Record<string, unknown>): ExecutionContext {
	return {
		switchToHttp: () => ({ getRequest: () => request }),
		getHandler: () => ProductsController.prototype.create,
		getClass: () => ProductsController,
	} as unknown as ExecutionContext;
}

describe('tenant entitlement enforcement integration', () => {
	it('exposes feature and quota metadata on the real Product create handler', () => {
		expect(
			Reflect.getMetadata(
				ENTITLEMENT_FEATURE_KEY,
				ProductsController.prototype.create,
			),
		).toBe('inventory');
		expect(
			Reflect.getMetadata(
				ENTITLEMENT_QUOTA_KEY,
				ProductsController.prototype.create,
			),
		).toEqual({
			dimension: 'maxProducts',
			requested: 1,
		});
	});

	it('returns the shared stable denial when the tenant has no entitlement', async () => {
		const reflector = new Reflector();
		const service = {
			assertFeature: jest.fn().mockRejectedValue(
				new EntitlementDenialException({
					reason: 'NO_SUBSCRIPTION',
					featureCode: 'inventory',
					quota: null,
					current: null,
					requested: null,
					limit: null,
				}),
			),
		} as unknown as EntitlementService;
		const guard = new EntitlementsGuard(reflector, service);

		await expect(
			guard.canActivate(
				context({ user: { tenantId: 'tenant-1' }, params: {}, body: {} }),
			),
		).rejects.toMatchObject({
			status: 403,
			denial: { reason: 'NO_SUBSCRIPTION', featureCode: 'inventory' },
		});
	});

	it('does not protect product reads, preserving downgrade overage reads', async () => {
		const prisma = {
			product: {
				findMany: jest.fn().mockResolvedValue([
					{
						id: 'product-1',
						sku: 'P-1',
						name: 'Existing',
						baseUnitId: 'unit-1',
						costPrice: 0n,
						salePrice: 0n,
						createdAt: new Date(),
					},
				]),
			},
			stock: {
				groupBy: jest.fn().mockResolvedValue([]),
			},
		};
		const service = new ProductsService(
			prisma as never,
			{} as never,
			{} as never,
		);
		await expect(service.list('tenant-1')).resolves.toHaveLength(1);
		expect(prisma.product.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { tenantId: 'tenant-1', deletedAt: null },
			}),
		);
	});

	it('does the final quota decision with a conditional counter update', async () => {
		const updateMany = jest.fn().mockResolvedValue({ count: 0 });
		const tx = {
			tenantQuotaCounter: {
				upsert: jest.fn(),
				updateMany,
			},
		};
		const entitlements = {
			getEffectiveEntitlement: jest.fn().mockResolvedValue(entitlement),
			getQuotaUsage: jest.fn().mockResolvedValue(1n),
		} as unknown as EntitlementService;
		const counters = new TenantQuotaCounterService(entitlements);

		await expect(
			counters.reserve(tx as never, 'tenant-1', 'maxProducts', 1n),
		).rejects.toMatchObject({
			status: 403,
			denial: {
				reason: 'QUOTA_EXCEEDED',
				quota: 'maxProducts',
				current: '1',
				requested: '1',
				limit: 1,
			},
		});
		expect(updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ used: { lte: 0n } }),
			}),
		);
	});

	it('keeps counter reservation and Product.create in one transaction callback', async () => {
		const transaction = jest.fn(async (callback: (tx: never) => unknown) =>
			callback({} as never),
		);
		const prisma = {
			$transaction: transaction,
		};
		const entitlements = { assertFeature: jest.fn() };
		const counters = { reserve: jest.fn() };
		const service = new ProductsService(
			prisma as never,
			entitlements as never,
			counters as never,
		);
		const dto = Object.assign(new CreateProductDto(), {
			sku: 'P-1',
			name: 'Product',
			baseUnitId: 'unit-1',
			costPrice: 0,
			salePrice: 0,
		});
		const tx = {
			unit: { findFirst: jest.fn().mockResolvedValue({ id: 'unit-1' }) },
			product: { create: jest.fn().mockResolvedValue({ id: 'product-1' }) },
		};
		transaction.mockImplementationOnce(
			async (callback: (value: typeof tx) => unknown) => callback(tx),
		);

		await service.create('tenant-1', dto);
		expect(entitlements.assertFeature).toHaveBeenCalledWith(
			'tenant-1',
			'inventory',
			tx,
		);
		expect(counters.reserve).toHaveBeenCalledWith(
			tx,
			'tenant-1',
			'maxProducts',
			1n,
		);
		expect(tx.product.create).toHaveBeenCalled();
	});
});
