import { NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
	function makeService() {
		const prisma = {
			product: {
				findMany: jest.fn(),
				findFirst: jest.fn(),
				updateMany: jest.fn(),
			},
			stock: { groupBy: jest.fn(), aggregate: jest.fn() },
		} as unknown as Prisma.TransactionClient;
		const service = new ProductsService(
			prisma as never,
			{ assertFeature: jest.fn() } as never,
			{ reserve: jest.fn() } as never,
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
			select: { id: true },
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
});
