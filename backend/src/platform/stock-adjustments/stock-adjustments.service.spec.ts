import { Prisma, ProductKind } from '@prisma/client';
import { StockAdjustmentsService } from './stock-adjustments.service';

describe('StockAdjustmentsService', () => {
	function makeService() {
		const tx = {
			warehouse: { findFirst: jest.fn() },
			product: { findMany: jest.fn() },
			stockAdjustment: {
				create: jest.fn(),
				findFirst: jest.fn(),
				findFirstOrThrow: jest.fn(),
				updateMany: jest.fn(),
			},
			stockAdjustmentLine: { update: jest.fn() },
			stock: {
				findFirst: jest.fn(),
				updateMany: jest.fn(),
				update: jest.fn(),
				create: jest.fn(),
			},
			productBatch: {
				findFirst: jest.fn(),
				updateMany: jest.fn(),
				update: jest.fn(),
			},
			stockMovement: { create: jest.fn() },
		};
		const prisma = {
			$transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
				callback(tx),
			),
		};
		return {
			service: new StockAdjustmentsService(prisma as never),
			tx,
			prisma,
		};
	}

	const draftInput = {
		warehouseId: 'wh-1',
		note: 'count',
		lines: [
			{
				productId: 'p-1',
				delta: '-2',
				reasonCode: 'MOISTURE_DAMAGE',
				batchId: 'b-1',
			},
		],
	};

	it('creates DRAFT explicitly and validates reason', async () => {
		const { service, tx } = makeService();
		tx.warehouse.findFirst.mockResolvedValue({ id: 'wh-1' });
		tx.product.findMany.mockResolvedValue([
			{ id: 'p-1', productKind: ProductKind.PESTICIDE },
		]);
		tx.stockAdjustment.create.mockResolvedValue({
			id: 'adj-1',
			tenantId: 't-1',
			docNo: 'ADJ-TEST',
			warehouseId: 'wh-1',
			status: 'DRAFT',
			note: 'count',
			createdBy: 'u-1',
			createdAt: new Date('2026-01-01'),
			lines: [
				{
					id: 'line-1',
					productId: 'p-1',
					batchId: 'b-1',
					qtyBefore: new Prisma.Decimal(0),
					qtyAfter: new Prisma.Decimal(0),
					delta: new Prisma.Decimal(-2),
					reasonCode: 'MOISTURE_DAMAGE',
				},
			],
		});

		const result = await service.createDraft('t-1', 'u-1', draftInput);

		expect(result.status).toBe('DRAFT');
		expect(tx.stockAdjustment.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: 'DRAFT' }),
			}),
		);
		expect(tx.stockMovement.create).not.toHaveBeenCalled();
	});

	it('rejects invalid reason on create', async () => {
		const { service, tx } = makeService();
		tx.warehouse.findFirst.mockResolvedValue({ id: 'wh-1' });
		tx.product.findMany.mockResolvedValue([
			{ id: 'p-1', productKind: ProductKind.FERTILIZER },
		]);
		await expect(
			service.createDraft('t-1', 'u-1', {
				warehouseId: 'wh-1',
				lines: [
					{
						productId: 'p-1',
						delta: '-1',
						reasonCode: 'RECALL_SCRAP',
					},
				],
			}),
		).rejects.toMatchObject({
			response: { reason: 'INVALID_REASON' },
		});
		expect(tx.stockAdjustment.create).not.toHaveBeenCalled();
	});

	it('rejects zero delta', async () => {
		const { service, tx } = makeService();
		tx.warehouse.findFirst.mockResolvedValue({ id: 'wh-1' });
		tx.product.findMany.mockResolvedValue([
			{ id: 'p-1', productKind: ProductKind.OTHER },
		]);
		await expect(
			service.createDraft('t-1', 'u-1', {
				warehouseId: 'wh-1',
				lines: [
					{ productId: 'p-1', delta: '0', reasonCode: 'COUNT_CORRECTION' },
				],
			}),
		).rejects.toMatchObject({
			response: { reason: 'INVALID_STATE' },
		});
	});

	it('completes happy path: stock decrease + batch + ADJUSTMENT movement', async () => {
		const { service, tx } = makeService();
		const lines = [
			{
				id: 'line-1',
				productId: 'p-1',
				batchId: 'b-1',
				qtyBefore: new Prisma.Decimal(0),
				qtyAfter: new Prisma.Decimal(0),
				delta: new Prisma.Decimal(-2),
				reasonCode: 'MOISTURE_DAMAGE',
			},
		];
		tx.stockAdjustment.findFirst.mockResolvedValue({
			id: 'adj-1',
			tenantId: 't-1',
			warehouseId: 'wh-1',
			status: 'DRAFT',
			lines,
		});
		tx.product.findMany.mockResolvedValue([
			{ id: 'p-1', productKind: ProductKind.PESTICIDE },
		]);
		tx.stock.findFirst.mockResolvedValue({
			id: 'stock-1',
			qty: new Prisma.Decimal(10),
		});
		tx.productBatch.findFirst.mockResolvedValue({
			id: 'b-1',
			qtyOnHand: new Prisma.Decimal(5),
		});
		tx.productBatch.updateMany.mockResolvedValue({ count: 1 });
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.stockMovement.create.mockResolvedValue({});
		tx.stockAdjustmentLine.update.mockResolvedValue({});
		tx.stockAdjustment.updateMany.mockResolvedValue({ count: 1 });
		tx.stockAdjustment.findFirstOrThrow.mockResolvedValue({
			id: 'adj-1',
			tenantId: 't-1',
			docNo: 'ADJ-1',
			warehouseId: 'wh-1',
			status: 'COMPLETED',
			note: null,
			createdBy: 'u-1',
			createdAt: new Date(),
			lines: [
				{
					...lines[0],
					qtyBefore: new Prisma.Decimal(10),
					qtyAfter: new Prisma.Decimal(8),
				},
			],
		});

		const result = await service.complete('t-1', 'u-1', 'adj-1');

		expect(result.status).toBe('COMPLETED');
		expect(tx.stock.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ qty: { gte: expect.anything() } }),
			}),
		);
		expect(tx.productBatch.updateMany).toHaveBeenCalled();
		expect(tx.stockMovement.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					reason: 'ADJUSTMENT',
					direction: 'OUT',
					refType: 'StockAdjustment',
					refId: 'adj-1',
					refLineId: 'line-1',
				}),
			}),
		);
	});

	it('rejects insufficient stock on complete', async () => {
		const { service, tx } = makeService();
		tx.stockAdjustment.findFirst.mockResolvedValue({
			id: 'adj-1',
			tenantId: 't-1',
			warehouseId: 'wh-1',
			status: 'DRAFT',
			lines: [
				{
					id: 'line-1',
					productId: 'p-1',
					batchId: null,
					qtyBefore: new Prisma.Decimal(0),
					qtyAfter: new Prisma.Decimal(0),
					delta: new Prisma.Decimal(-5),
					reasonCode: 'COUNT_CORRECTION',
				},
			],
		});
		tx.product.findMany.mockResolvedValue([
			{ id: 'p-1', productKind: ProductKind.OTHER },
		]);
		tx.stock.findFirst.mockResolvedValue({
			id: 'stock-1',
			qty: new Prisma.Decimal(2),
		});

		await expect(service.complete('t-1', 'u-1', 'adj-1')).rejects.toMatchObject(
			{
				response: { reason: 'INSUFFICIENT_STOCK' },
			},
		);
		expect(tx.stockMovement.create).not.toHaveBeenCalled();
	});

	it('rejects BATCH_REQUIRED when controlled decrease lacks batch', async () => {
		const { service, tx } = makeService();
		tx.stockAdjustment.findFirst.mockResolvedValue({
			id: 'adj-1',
			tenantId: 't-1',
			warehouseId: 'wh-1',
			status: 'DRAFT',
			lines: [
				{
					id: 'line-1',
					productId: 'p-1',
					batchId: null,
					qtyBefore: new Prisma.Decimal(0),
					qtyAfter: new Prisma.Decimal(0),
					delta: new Prisma.Decimal(-1),
					reasonCode: 'MOISTURE_DAMAGE',
				},
			],
		});
		tx.product.findMany.mockResolvedValue([
			{ id: 'p-1', productKind: ProductKind.PESTICIDE },
		]);
		tx.stock.findFirst.mockResolvedValue({
			id: 'stock-1',
			qty: new Prisma.Decimal(10),
		});

		await expect(service.complete('t-1', 'u-1', 'adj-1')).rejects.toMatchObject(
			{
				response: { reason: 'BATCH_REQUIRED' },
			},
		);
	});

	it('rejects double complete (COMPLETED immutable)', async () => {
		const { service, tx } = makeService();
		tx.stockAdjustment.findFirst.mockResolvedValue({
			id: 'adj-1',
			tenantId: 't-1',
			warehouseId: 'wh-1',
			status: 'COMPLETED',
			lines: [],
		});
		await expect(service.complete('t-1', 'u-1', 'adj-1')).rejects.toMatchObject(
			{
				response: { reason: 'INVALID_STATE' },
			},
		);
	});

	it('rejects INSUFFICIENT_BATCH when batch qty too low', async () => {
		const { service, tx } = makeService();
		tx.stockAdjustment.findFirst.mockResolvedValue({
			id: 'adj-1',
			tenantId: 't-1',
			warehouseId: 'wh-1',
			status: 'DRAFT',
			lines: [
				{
					id: 'line-1',
					productId: 'p-1',
					batchId: 'b-1',
					qtyBefore: new Prisma.Decimal(0),
					qtyAfter: new Prisma.Decimal(0),
					delta: new Prisma.Decimal(-3),
					reasonCode: 'EXPIRED_SCRAP',
				},
			],
		});
		tx.product.findMany.mockResolvedValue([
			{ id: 'p-1', productKind: ProductKind.PESTICIDE },
		]);
		tx.stock.findFirst.mockResolvedValue({
			id: 'stock-1',
			qty: new Prisma.Decimal(10),
		});
		tx.productBatch.findFirst.mockResolvedValue({
			id: 'b-1',
			qtyOnHand: new Prisma.Decimal(1),
		});
		tx.productBatch.updateMany.mockResolvedValue({ count: 0 });

		await expect(service.complete('t-1', 'u-1', 'adj-1')).rejects.toMatchObject(
			{
				response: { reason: 'INSUFFICIENT_BATCH' },
			},
		);
		expect(tx.stockMovement.create).not.toHaveBeenCalled();
	});
});
