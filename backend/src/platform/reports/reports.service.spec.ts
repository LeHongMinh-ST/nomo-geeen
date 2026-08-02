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
				businessGroup: 'HUMAN_DRUGS' as never,
			},
		);
		expect(result.filter).toEqual({ businessGroup: 'HUMAN_DRUGS' });
		expect(result.items).toEqual([]);
		expect(result.byBusinessGroup).toEqual([]);
		expect(prisma.stock.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					tenantId: 'tenant-1',
					product: { businessGroup: 'HUMAN_DRUGS' },
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

	it('returns a JSON-safe home dashboard summary from live domain data', async () => {
		const now = new Date('2026-07-28T10:00:00+07:00');
		const prisma = {
			sale: {
				aggregate: jest
					.fn()
					.mockResolvedValueOnce({
						_count: { _all: 3 },
						_sum: { total: 12_000_000n },
					})
					.mockResolvedValueOnce({
						_count: { _all: 2 },
						_sum: { total: 10_000_000n },
					})
					.mockResolvedValueOnce({
						_count: { _all: 40 },
						_sum: { total: 100_000_000n },
					})
					.mockResolvedValueOnce({
						_count: { _all: 30 },
						_sum: { total: 80_000_000n },
					}),
				findMany: jest.fn().mockResolvedValue([
					{ soldAt: new Date('2026-07-28T09:00:00+07:00'), total: 5_000_000n },
					{ soldAt: new Date('2026-07-27T09:00:00+07:00'), total: 4_000_000n },
				]),
			},
			saleLine: {
				findMany: jest.fn().mockResolvedValue([
					{
						productId: 'p1',
						productNameSnapshot: 'NPK',
						qtyBase: new Prisma.Decimal('10'),
						lineTotal: 2_000_000n,
					},
				]),
			},
			customer: {
				aggregate: jest.fn().mockResolvedValue({
					_count: { _all: 5 },
					_sum: { balance: 15_000_000n },
				}),
			},
			tenantSettings: {
				findUnique: jest.fn().mockResolvedValue({
					lowStockThresholdDefault: new Prisma.Decimal('10'),
				}),
			},
			stock: {
				findMany: jest.fn().mockResolvedValue([
					{
						qty: new Prisma.Decimal('4'),
						warehouseId: 'w1',
						product: {
							status: 'ACTIVE',
							batches: [
								{
									tenantId: 'tenant-1',
									warehouseId: 'w1',
									expiresAt: new Date('2026-08-10T00:00:00.000Z'),
									qtyOnHand: new Prisma.Decimal('4'),
								},
							],
						},
					},
					{
						qty: new Prisma.Decimal('50'),
						warehouseId: 'w1',
						product: {
							status: 'ACTIVE',
							batches: [],
						},
					},
				]),
			},
		};
		const result = await new ReportsService(prisma as never).homeSummary(
			'tenant-1',
			now,
		);
		expect(result.today).toMatchObject({
			revenue: '12000000',
			orders: 3,
			previousRevenue: '10000000',
		});
		expect(result.month.revenue).toBe('100000000');
		expect(result.receivable).toEqual({
			balance: '15000000',
			customers: 5,
		});
		expect(result.alerts.lowStock).toBe(1);
		expect(result.alerts.debtOwing).toBe(5);
		expect(result.alerts.nearExpiry).toBe(1);
		expect(result.last7Days).toHaveLength(7);
		expect(result.last7Days.at(-1)).toMatchObject({
			date: '2026-07-28',
			revenue: '5000000',
		});
		expect(result.topProducts[0]).toMatchObject({
			productId: 'p1',
			name: 'NPK',
			total: '2000000',
			qtyBase: '10',
		});
		expect(() => JSON.stringify(result)).not.toThrow();
	});

	describe('batchLedger', () => {
		it('returns JSON-safe movements with batch and registration context', async () => {
			const prisma = {
				stockMovement: {
					findMany: jest.fn().mockResolvedValue([
						{
							id: 'm1',
							occurredAt: new Date('2026-07-20T02:00:00.000Z'),
							direction: 'IN',
							qty: new Prisma.Decimal('10'),
							unitCost: 50_000n,
							reason: 'PURCHASE',
							refType: 'purchase',
							refId: 'pu-1',
							warehouseId: 'w1',
							product: {
								id: 'p1',
								sku: 'SKU-1',
								name: 'Thuốc A',
								productKind: 'PESTICIDE',
								registrationNo: 'SĐK-001',
							},
							batch: {
								id: 'b1',
								batchCode: 'L-01',
								expiresAt: new Date('2027-01-01T00:00:00.000Z'),
							},
						},
						{
							id: 'm2',
							occurredAt: new Date('2026-07-21T02:00:00.000Z'),
							direction: 'OUT',
							qty: new Prisma.Decimal('4'),
							unitCost: null,
							reason: 'SALE',
							refType: 'sale',
							refId: 'sa-1',
							warehouseId: 'w1',
							product: {
								id: 'p1',
								sku: 'SKU-1',
								name: 'Thuốc A',
								productKind: 'PESTICIDE',
								registrationNo: 'SĐK-001',
							},
							batch: null,
						},
					]),
				},
			};
			const result = await new ReportsService(prisma as never).batchLedger(
				'tenant-1',
				{ from: '2026-07-01', to: '2026-08-01' },
			);
			expect(result.totals).toEqual({
				movementCount: 2,
				inboundQty: '10',
				outboundQty: '4',
			});
			expect(result.entries[0]).toMatchObject({
				qty: '10',
				unitCost: '50000',
				batchCode: 'L-01',
			});
			expect(result.entries[1]).toMatchObject({
				batchCode: null,
				unitCost: null,
			});
			expect(() => JSON.stringify(result)).not.toThrow();
			expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({ tenantId: 'tenant-1' }),
				}),
			);
		});

		it('scopes the ledger to one product when asked', async () => {
			const prisma = {
				stockMovement: { findMany: jest.fn().mockResolvedValue([]) },
			};
			const result = await new ReportsService(prisma as never).batchLedger(
				'tenant-1',
				{ productId: 'p1' },
			);
			expect(result.filter).toEqual({ productId: 'p1' });
			expect(prisma.stockMovement.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({ productId: 'p1' }),
				}),
			);
		});

		it('rejects an inverted date range', async () => {
			await expect(
				new ReportsService({} as never).batchLedger('tenant-1', {
					from: '2026-02-01',
					to: '2026-01-01',
				}),
			).rejects.toBeInstanceOf(BadRequestException);
		});
	});

	describe('registrationTrace', () => {
		it('groups batches and completed sales per product', async () => {
			const prisma = {
				product: {
					findMany: jest.fn().mockResolvedValue([
						{
							id: 'p1',
							sku: 'SKU-1',
							name: 'Thuốc A',
							productKind: 'PESTICIDE',
							registrationNo: 'SĐK-001',
							requiresPrescription: false,
						},
					]),
				},
				productBatch: {
					findMany: jest.fn().mockResolvedValue([
						{
							id: 'b1',
							productId: 'p1',
							batchCode: 'L-01',
							expiresAt: null,
							qtyOnHand: new Prisma.Decimal('6'),
							isRecalled: false,
						},
					]),
				},
				saleLine: {
					findMany: jest.fn().mockResolvedValue([
						{
							productId: 'p1',
							qtyBase: new Prisma.Decimal('4'),
							lineTotal: 200_000n,
							sale: {
								id: 'sa-1',
								docNo: 'BH-0001',
								soldAt: new Date('2026-07-21T02:00:00.000Z'),
								customerId: 'c1',
							},
						},
					]),
				},
			};
			const result = await new ReportsService(
				prisma as never,
			).registrationTrace('tenant-1', { registrationNo: ' SĐK-001 ' });
			expect(result.registrationNo).toBe('SĐK-001');
			expect(result.items).toHaveLength(1);
			expect(result.items[0].soldQtyBase).toBe('4');
			expect(result.items[0].batches[0]).toMatchObject({ qtyOnHand: '6' });
			expect(result.items[0].sales[0]).toMatchObject({
				docNo: 'BH-0001',
				qtyBase: '4',
				lineTotal: '200000',
			});
			expect(() => JSON.stringify(result)).not.toThrow();
			expect(prisma.product.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({ registrationNo: 'SĐK-001' }),
				}),
			);
		});

		it('returns no items and skips follow-up queries when nothing matches', async () => {
			const prisma = {
				product: { findMany: jest.fn().mockResolvedValue([]) },
				productBatch: { findMany: jest.fn() },
				saleLine: { findMany: jest.fn() },
			};
			const result = await new ReportsService(
				prisma as never,
			).registrationTrace('tenant-1', { registrationNo: 'SĐK-999' });
			expect(result.items).toEqual([]);
			expect(prisma.productBatch.findMany).not.toHaveBeenCalled();
			expect(prisma.saleLine.findMany).not.toHaveBeenCalled();
		});

		it('rejects a blank registration number', async () => {
			await expect(
				new ReportsService({} as never).registrationTrace('tenant-1', {
					registrationNo: '   ',
				}),
			).rejects.toBeInstanceOf(BadRequestException);
		});
	});
});
