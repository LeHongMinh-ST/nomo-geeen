import {
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { BusinessGroup, type Prisma } from '@prisma/client';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
	function makeService() {
		const prisma = {
			$transaction: jest.fn(async (callback: (client: unknown) => unknown) =>
				callback(prisma),
			),
			product: {
				findMany: jest.fn(),
				findFirst: jest.fn(),
				updateMany: jest.fn(),
				groupBy: jest.fn().mockResolvedValue([]),
			},
			stock: { groupBy: jest.fn(), aggregate: jest.fn() },
			tenantBusinessGroup: { findMany: jest.fn(), upsert: jest.fn() },
		} as unknown as Prisma.TransactionClient;
		const service = new ProductsService(
			prisma as never,
			{ assertFeature: jest.fn() } as never,
			{ reserve: jest.fn() } as never,
			{ writeInTx: jest.fn() } as never,
		);
		return { prisma, service };
	}

	it('scopes product reads and stock aggregation to the requested tenant', async () => {
		const { prisma, service } = makeService();
		(prisma.product.findMany as jest.Mock).mockResolvedValue([
			{
				id: 'product-1',
				sku: 'SKU-1',
				name: 'Product',
				barcode: null,
				baseUnitId: 'unit-1',
				categoryId: null,
				brandId: null,
				manufacturerId: null,
				costPrice: 100n,
				salePrice: 150n,
				wholesalePrice: null,
				isLocked: false,
				isRecalled: false,
				status: 'ACTIVE',
				createdAt: new Date(),
			},
		]);
		(prisma.stock.groupBy as jest.Mock).mockResolvedValue([
			{ productId: 'product-1', _sum: { qty: '12' } },
		]);

		const result = await service.list('tenant-1');

		expect(prisma.product.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { tenantId: 'tenant-1', deletedAt: null },
			}),
		);
		expect(prisma.stock.groupBy).toHaveBeenCalledWith({
			by: ['productId'],
			where: { tenantId: 'tenant-1', productId: { in: ['product-1'] } },
			_sum: { qty: true },
		});
		expect(result[0]).toEqual(expect.objectContaining({ stock: '12' }));
	});

	it('does not mutate a product outside the tenant', async () => {
		const { prisma, service } = makeService();
		const tx = {
			product: { findFirst: jest.fn().mockResolvedValue(null) },
		};
		(prisma as unknown as { $transaction: jest.Mock }).$transaction = jest.fn(
			async (callback: (client: typeof tx) => unknown) => callback(tx),
		);

		await expect(
			service.update('tenant-1', 'product-2', { name: 'Nope' }),
		).rejects.toBeInstanceOf(NotFoundException);
		expect(tx.product.findFirst).toHaveBeenCalledWith({
			where: { id: 'product-2', tenantId: 'tenant-1', deletedAt: null },
			select: { id: true, productKind: true, businessGroup: true, attrs: true },
		});
	});

	it('returns the tenant stock quantity after an update', async () => {
		const { prisma, service } = makeService();
		const tx = {
			product: {
				findFirst: jest.fn().mockResolvedValue({ id: 'product-1' }),
				update: jest.fn().mockResolvedValue({
					id: 'product-1',
					sku: 'SKU-1',
					name: 'Updated product',
					barcode: null,
					baseUnitId: 'unit-1',
					categoryId: null,
					brandId: null,
					manufacturerId: null,
					costPrice: 100n,
					salePrice: 150n,
					wholesalePrice: null,
					isLocked: false,
					isRecalled: false,
					status: 'ACTIVE',
					createdAt: new Date(),
					updatedAt: new Date(),
				}),
			},
			stock: { aggregate: jest.fn().mockResolvedValue({ _sum: { qty: 12n } }) },
		};
		(prisma as unknown as { $transaction: jest.Mock }).$transaction = jest.fn(
			async (callback: (client: typeof tx) => unknown) => callback(tx),
		);

		await expect(
			service.update('tenant-1', 'product-1', { name: 'Updated product' }),
		).resolves.toEqual(expect.objectContaining({ stock: '12' }));
		expect(tx.stock.aggregate).toHaveBeenCalledWith({
			where: { tenantId: 'tenant-1', productId: 'product-1' },
			_sum: { qty: true },
		});
	});

	it('soft deletes only an active product in the tenant', async () => {
		const { prisma, service } = makeService();
		(prisma.product.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

		await expect(service.remove('tenant-1', 'product-1')).resolves.toEqual({
			id: 'product-1',
			deleted: true,
		});
		expect(prisma.product.updateMany).toHaveBeenCalledWith({
			where: { id: 'product-1', tenantId: 'tenant-1', deletedAt: null },
			data: { deletedAt: expect.any(Date) },
		});
	});

	describe('businessGroups', () => {
		it('reports an active product count for every group in the tenant', async () => {
			const { prisma, service } = makeService();
			(prisma.tenantBusinessGroup.findMany as jest.Mock).mockResolvedValue([
				{ businessGroup: BusinessGroup.CROP_INPUTS, enabled: true },
			]);
			(prisma.product.groupBy as jest.Mock).mockResolvedValue([
				{ businessGroup: BusinessGroup.CROP_INPUTS, _count: { _all: 7 } },
				{ businessGroup: null, _count: { _all: 4 } },
			]);

			const result = await service.businessGroups('tenant-1');

			expect(prisma.product.groupBy).toHaveBeenCalledWith({
				by: ['businessGroup'],
				where: {
					tenantId: 'tenant-1',
					deletedAt: null,
					status: 'ACTIVE',
					businessGroup: { not: null },
				},
				_count: { _all: true },
			});
			expect(result.configured).toBe(true);
			// Every group is present and zero-filled; the null bucket is ignored.
			expect(result.productCounts).toEqual({
				CROP_INPUTS: 7,
				CROP_SEEDLINGS: 0,
				ANIMAL_FEED: 0,
				VETERINARY_DRUGS: 0,
				LIVESTOCK: 0,
			});
		});
	});

	describe('updateBusinessGroups', () => {
		it('rejects an all-off payload with 422 NO_ENABLED_BUSINESS_GROUP', async () => {
			const { prisma, service } = makeService();

			await expect(
				service.updateBusinessGroups('tenant-1', []),
			).rejects.toBeInstanceOf(UnprocessableEntityException);
			await expect(
				service.updateBusinessGroups('tenant-1', []),
			).rejects.toMatchObject({
				response: { reason: 'NO_ENABLED_BUSINESS_GROUP' },
			});
			// Nothing was written — the guard runs before the transaction opens.
			expect(prisma.$transaction).not.toHaveBeenCalled();
			expect(prisma.tenantBusinessGroup.upsert).not.toHaveBeenCalled();
		});

		it('persists every group and returns fresh counts when one stays enabled', async () => {
			const { prisma, service } = makeService();
			(prisma.tenantBusinessGroup.findMany as jest.Mock).mockResolvedValue([
				{ businessGroup: BusinessGroup.CROP_INPUTS, enabled: true },
				{ businessGroup: BusinessGroup.LIVESTOCK, enabled: false },
			]);
			(prisma.product.groupBy as jest.Mock).mockResolvedValue([
				{ businessGroup: BusinessGroup.LIVESTOCK, _count: { _all: 3 } },
			]);

			const result = await service.updateBusinessGroups('tenant-1', [
				BusinessGroup.CROP_INPUTS,
			]);

			// Upsert covers the whole enum so a disabled group is stored as false.
			expect(prisma.tenantBusinessGroup.upsert).toHaveBeenCalledTimes(
				Object.values(BusinessGroup).length,
			);
			expect(prisma.tenantBusinessGroup.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						tenantId_businessGroup: {
							tenantId: 'tenant-1',
							businessGroup: BusinessGroup.LIVESTOCK,
						},
					},
					update: { enabled: false },
				}),
			);
			expect(result.configured).toBe(true);
			// Disabling a group does not remove its existing products.
			expect(result.productCounts.LIVESTOCK).toBe(3);
		});
	});
});
