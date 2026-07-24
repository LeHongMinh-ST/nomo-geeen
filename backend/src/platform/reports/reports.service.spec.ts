import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
	it('returns tenant-scoped stock and batch rows', async () => {
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
		} as never;
		const result = await new ReportsService(prisma).stockSummary('tenant-1');
		expect(result.items).toHaveLength(1);
		expect(result.items[0].batches).toHaveLength(1);
		expect(result.items[0]).toMatchObject({ qty: '4.5', avgCost: '100' });
		expect(result.items[0].batches[0]).toMatchObject({ qtyOnHand: '4.25' });
		expect(() => JSON.stringify(result)).not.toThrow();
		expect(prisma.stock.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { tenantId: 'tenant-1' } }),
		);
	});

	it('returns a JSON-safe sales summary contract', async () => {
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
					},
					{
						productId: 'p1',
						productNameSnapshot: 'Pesticide',
						qtyBase: new Prisma.Decimal('1.5'),
						lineTotal: 50000n,
					},
				]),
			},
		} as never;
		const result = await new ReportsService(prisma).salesSummary('tenant-1', {
			from: '2026-01-01',
			to: '2026-01-31',
		});

		expect(result).toMatchObject({
			orders: 2,
			total: '150000',
			amountPaid: '100000',
			debtAmount: '50000',
		});
		expect(result.topProducts[0]).toMatchObject({
			productId: 'p1',
			qtyBase: '4',
			total: '150000',
		});
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
