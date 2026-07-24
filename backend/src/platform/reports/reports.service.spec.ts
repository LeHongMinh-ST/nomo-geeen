import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReportsService } from './reports.service';

type PrismaMock = {
	stock: { findMany: jest.Mock };
	productBatch: { findMany: jest.Mock };
	sale: { aggregate: jest.Mock };
	saleLine: { findMany: jest.Mock };
};

describe('ReportsService', () => {
	it('returns tenant-scoped stock and batch rows with group breakdown', async () => {
		const prisma = {
			stock: {
				findMany: jest.fn().mockResolvedValue([
					{
						warehouseId: 'w1',
						productId: 'p1',
						qty: new Prisma.Decimal('4.5'),
						avgCost: 100n,
						product: {
							id: 'p1',
							name: 'Pesticide',
							productKind: 'PESTICIDE',
							businessGroup: 'CROP_INPUTS',
							sku: 'SKU-1',
							baseUnitId: 'u1',
						},
					},
				]),
			},
			productBatch: {
				findMany: jest.fn().mockResolvedValue([
					{
						id: 'b1',
						productId: 'p1',
						warehouseId: 'w1',
						batchCode: 'B-1',
						expiresAt: null,
						qtyOnHand: new Prisma.Decimal('4.25'),
						isRecalled: false,
					},
				]),
			},
		} as unknown as PrismaMock;
		const result = await new ReportsService(prisma as never).stockSummary(
			'tenant-1',
		);
		expect(result.items).toHaveLength(1);
		expect(result.items[0].batches).toHaveLength(1);
		expect(result.items[0]).toMatchObject({ qty: '4.5', avgCost: '100' });
		expect(result.items[0].batches[0]).toMatchObject({ qtyOnHand: '4.25' });
		expect(result.filter).toEqual({ businessGroup: null });
		expect(result.byBusinessGroup).toEqual([
			{
				businessGroup: 'CROP_INPUTS',
				label: 'Thuốc bảo vệ thực vật + Phân bón',
				itemCount: 1,
				qty: '4.5',
			},
		]);
		expect(() => JSON.stringify(result)).not.toThrow();
		expect(prisma.stock.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { tenantId: 'tenant-1' } }),
		);
	});

	it('filters stock by businessGroup enum', async () => {
		const prisma = {
			stock: {
				findMany: jest.fn().mockResolvedValue([]),
			},
			productBatch: {
				findMany: jest.fn().mockResolvedValue([]),
			},
		} as unknown as PrismaMock;
		const result = await new ReportsService(prisma as never).stockSummary(
			'tenant-1',
			{
				businessGroup: 'LIVESTOCK' as never,
			},
		);
		expect(result.filter).toEqual({ businessGroup: 'LIVESTOCK' });
		expect(result.items).toEqual([]);
		expect(result.byBusinessGroup).toEqual([]);
		expect(prisma.stock.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					tenantId: 'tenant-1',
					product: { businessGroup: 'LIVESTOCK' },
				},
			}),
		);
		expect(prisma.productBatch.findMany).not.toHaveBeenCalled();
	});

	it('returns a JSON-safe sales summary contract with group breakdown', async () => {
		const prisma = {
			sale: {
				aggregate: jest.fn().mockResolvedValue({
					_count: { _all: 2 },
					_sum: { total: 150000n, amountPaid: 100000n, debtAmount: 50000n },
				}),
			},
			saleLine: {
				findMany: jest.fn().mockResolvedValue([
					{
						productId: 'p1',
						productNameSnapshot: 'Pesticide',
						qtyBase: new Prisma.Decimal('2.5'),
						lineTotal: 100000n,
						product: { businessGroup: 'CROP_INPUTS' },
					},
					{
						productId: 'p1',
						productNameSnapshot: 'Pesticide',
						qtyBase: new Prisma.Decimal('1.5'),
						lineTotal: 50000n,
						product: { businessGroup: 'CROP_INPUTS' },
					},
				]),
			},
		} as unknown as PrismaMock;
		const result = await new ReportsService(prisma as never).salesSummary(
			'tenant-1',
			{
				from: '2026-01-01',
				to: '2026-01-31',
			},
		);

		expect(result).toMatchObject({
			orders: 2,
			total: '150000',
			amountPaid: '100000',
			debtAmount: '50000',
			filter: { businessGroup: null },
		});
		expect(result.topProducts[0]).toMatchObject({
			productId: 'p1',
			qtyBase: '4',
			total: '150000',
		});
		expect(result.byBusinessGroup).toEqual([
			{
				businessGroup: 'CROP_INPUTS',
				label: 'Thuốc bảo vệ thực vật + Phân bón',
				lineCount: 2,
				qtyBase: '4',
				total: '150000',
			},
		]);
		expect(() => JSON.stringify(result)).not.toThrow();
		expect(prisma.sale.aggregate).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ tenantId: 'tenant-1' }),
			}),
		);
		expect(prisma.saleLine.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ tenantId: 'tenant-1' }),
			}),
		);
	});

	it('filters sales lines by businessGroup', async () => {
		const prisma = {
			sale: {
				aggregate: jest.fn().mockResolvedValue({
					_count: { _all: 1 },
					_sum: { total: 10000n, amountPaid: 10000n, debtAmount: 0n },
				}),
			},
			saleLine: {
				findMany: jest.fn().mockResolvedValue([
					{
						productId: 'p2',
						productNameSnapshot: 'Feed',
						qtyBase: new Prisma.Decimal('3'),
						lineTotal: 10000n,
						product: { businessGroup: 'ANIMAL_FEED' },
					},
				]),
			},
		} as unknown as PrismaMock;
		const result = await new ReportsService(prisma as never).salesSummary(
			'tenant-1',
			{
				from: '2026-01-01',
				to: '2026-01-31',
				businessGroup: 'ANIMAL_FEED' as never,
			},
		);
		expect(result.filter).toEqual({ businessGroup: 'ANIMAL_FEED' });
		expect(result.byBusinessGroup[0]).toMatchObject({
			businessGroup: 'ANIMAL_FEED',
			lineCount: 1,
		});
		expect(prisma.saleLine.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					product: { businessGroup: 'ANIMAL_FEED' },
				}),
			}),
		);
	});

	it('rejects inverted and oversized date ranges', async () => {
		const service = new ReportsService({} as never);
		await expect(
			service.salesSummary('tenant-1', {
				from: '2026-02-01',
				to: '2026-01-01',
			}),
		).rejects.toBeInstanceOf(BadRequestException);
		await expect(
			service.salesSummary('tenant-1', {
				from: '2024-01-01',
				to: '2026-01-01',
			}),
		).rejects.toBeInstanceOf(BadRequestException);
	});
});
