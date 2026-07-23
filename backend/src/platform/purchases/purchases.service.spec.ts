import 'reflect-metadata';
import { Prisma, ProductKind, PurchaseStatus } from '@prisma/client';
import { PurchasePaymentMethod } from './dto/create-purchase.dto';
import { PurchasesService } from './purchases.service';

describe('PurchasesService', () => {
	function makeService() {
		const tx = {
			purchase: {
				findFirst: jest.fn(),
				create: jest.fn(),
				findUniqueOrThrow: jest.fn(),
				update: jest.fn(),
			},
			warehouse: { findMany: jest.fn() },
			supplier: { findFirst: jest.fn(), update: jest.fn() },
			product: { findMany: jest.fn() },
			purchaseLine: { deleteMany: jest.fn(), update: jest.fn() },
			productBatch: {
				upsert: jest.fn(),
				findFirst: jest.fn().mockResolvedValue(null),
			},
			stock: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
			stockMovement: { create: jest.fn() },
			debtLedger: { create: jest.fn() },
		};
		const prisma = {
			$transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
				callback(tx),
			),
		};
		return { service: new PurchasesService(prisma as never), tx, prisma };
	}
	function dto(overrides: Record<string, unknown> = {}) {
		return {
			idempotencyKey: '2b6f99c0-bb7b-4df5-8b08-ef9ce38b8550',
			supplierId: 'supplier-1',
			status: 'DRAFT',
			discountAmount: 0,
			shippingFee: 0,
			amountPaid: 0,
			paymentMethod: PurchasePaymentMethod.DEBT,
			lines: [
				{
					productId: 'product-1',
					unitId: 'unit-1',
					qty: '2',
					unitPrice: 1000,
					lineDiscount: 0,
				},
			],
			...overrides,
		} as never;
	}

	it('creates a draft without stock or debt effects and derives base quantity', async () => {
		const { service, tx } = makeService();
		tx.purchase.findFirst.mockResolvedValue(null);
		tx.warehouse.findMany.mockResolvedValue([{ id: 'warehouse-1' }]);
		tx.supplier.findFirst.mockResolvedValue({ id: 'supplier-1' });
		tx.product.findMany.mockResolvedValue([
			{
				id: 'product-1',
				baseUnitId: 'unit-1',
				status: 'ACTIVE',
				isLocked: false,
				isRecalled: false,
				conversions: [],
			},
		]);
		tx.purchase.create.mockResolvedValue({
			id: 'purchase-1',
			docNo: 'PN-TEST',
			idempotencyKey: '2b6f99c0-bb7b-4df5-8b08-ef9ce38b8550',
			status: 'DRAFT',
			supplierId: 'supplier-1',
			warehouseId: 'warehouse-1',
			subtotal: 2000n,
			discountAmount: 0n,
			shippingFee: 0n,
			total: 2000n,
			amountPaid: 0n,
			paymentMethod: 'DEBT',
			debtAmount: 2000n,
			lines: [],
			createdAt: new Date(),
			completedAt: null,
		});
		const result = await service.create('tenant-1', 'user-1', dto());
		expect(result).toEqual(
			expect.objectContaining({
				status: 'DRAFT',
				total: 2000,
				debtAmount: 2000,
			}),
		);
		expect(tx.purchase.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ status: 'DRAFT' }),
			}),
		);
	});

	it('rejects a unit without a PURCHASE/BOTH conversion before persistence', async () => {
		const { service, tx } = makeService();
		const internals = service as unknown as {
			prepareLines: (
				client: unknown,
				tenant: string,
				input: unknown,
			) => Promise<unknown>;
		};
		tx.product.findMany.mockResolvedValue([
			{
				id: 'product-1',
				baseUnitId: 'unit-base',
				status: 'ACTIVE',
				isLocked: false,
				isRecalled: false,
				conversions: [],
			},
		]);
		await expect(
			internals.prepareLines(tx, 'tenant-1', dto()),
		).rejects.toMatchObject({ response: { reason: 'INVALID_CONVERSION' } });
		expect(tx.purchase.create).not.toHaveBeenCalled();
	});

	it('calculates an effective unit cost using integer money', () => {
		const { service } = makeService();
		const internals = service as unknown as {
			toUnitCost: (total: bigint, quantity: Prisma.Decimal) => bigint;
		};
		expect(internals.toUnitCost(1100n, new Prisma.Decimal(2))).toBe(550n);
	});

	function lineFields(overrides: Record<string, unknown> = {}) {
		return {
			id: 'line-1',
			productId: 'product-1',
			unitId: 'unit-1',
			qty: new Prisma.Decimal(2),
			qtyBase: new Prisma.Decimal(2),
			unitPrice: 1000n,
			lineDiscount: 0n,
			lineTotal: 2000n,
			batchCode: 'LOT-A',
			expiresAt: new Date('2099-06-01'),
			product: { productKind: ProductKind.PESTICIDE, name: 'P', sku: 'S' },
			unit: { id: 'unit-1', code: 'U', name: 'Unit' },
			...overrides,
		};
	}

	function completedResponse(purchase: {
		lines: Array<Record<string, unknown>>;
		[key: string]: unknown;
	}) {
		return {
			...purchase,
			status: PurchaseStatus.COMPLETED,
			completedAt: new Date(),
			createdAt: new Date(),
			subtotal: 2000n,
			discountAmount: 0n,
			shippingFee: 0n,
			total: 2000n,
			amountPaid: 0n,
			paymentMethod: 'DEBT',
			debtAmount: 0n,
			docNo: 'PN-TEST',
			idempotencyKey: '2b6f99c0-bb7b-4df5-8b08-ef9ce38b8550',
			supplier: { name: 'Sup' },
			lines: purchase.lines.map((line) => ({
				...lineFields(),
				...line,
				batchId: (line.batchId as string) ?? 'batch-1',
			})),
		};
	}

	function draftPurchase(overrides: Record<string, unknown> = {}) {
		return {
			id: 'purchase-1',
			tenantId: 'tenant-1',
			idempotencyKey: '2b6f99c0-bb7b-4df5-8b08-ef9ce38b8550',
			status: PurchaseStatus.DRAFT,
			warehouseId: 'warehouse-1',
			supplierId: 'supplier-1',
			discountAmount: 0n,
			shippingFee: 0n,
			debtAmount: 0n,
			lines: [lineFields()],
			...overrides,
		};
	}

	it('creates ProductBatch, links line and movement on complete', async () => {
		const { service, tx } = makeService();
		const purchase = draftPurchase();
		tx.purchase.findFirst
			.mockResolvedValueOnce(purchase)
			.mockResolvedValueOnce({
				...purchase,
				status: PurchaseStatus.COMPLETED,
				lines: [{ ...purchase.lines[0], batchId: 'batch-1' }],
				completedAt: new Date(),
			});
		// completeInTransaction calls findFirst then update with include
		tx.warehouse.findMany.mockResolvedValue([{ id: 'warehouse-1' }]);
		tx.productBatch.upsert.mockResolvedValue({ id: 'batch-1' });
		tx.purchaseLine.update.mockResolvedValue({});
		tx.stock.findUnique.mockResolvedValue(null);
		tx.stock.create.mockResolvedValue({});
		tx.stockMovement.create.mockResolvedValue({});
		tx.purchase.update.mockResolvedValue(
			completedResponse({
				...purchase,
				lines: [{ ...purchase.lines[0], batchId: 'batch-1' }],
			}),
		);

		const result = await service.complete(
			'tenant-1',
			'user-1',
			'purchase-1',
			'2b6f99c0-bb7b-4df5-8b08-ef9ce38b8550',
		);

		expect(tx.productBatch.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					tenantId_productId_warehouseId_batchCode: {
						tenantId: 'tenant-1',
						productId: 'product-1',
						warehouseId: 'warehouse-1',
						batchCode: 'LOT-A',
					},
				},
				create: expect.objectContaining({
					qtyOnHand: purchase.lines[0].qtyBase,
					batchCode: 'LOT-A',
				}),
				update: expect.objectContaining({
					qtyOnHand: { increment: purchase.lines[0].qtyBase },
				}),
			}),
		);
		expect(tx.purchaseLine.update).toHaveBeenCalledWith({
			where: { id: 'line-1' },
			data: { batchId: 'batch-1' },
		});
		expect(tx.stockMovement.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					batchId: 'batch-1',
					direction: 'IN',
					productId: 'product-1',
					tenantId: 'tenant-1',
					warehouseId: 'warehouse-1',
				}),
			}),
		);
		expect(result.status).toBe(PurchaseStatus.COMPLETED);
	});

	it('reuses batch by incrementing qtyOnHand on second receipt', async () => {
		const { service, tx } = makeService();
		const purchase = draftPurchase();
		tx.purchase.findFirst.mockResolvedValue(purchase);
		tx.warehouse.findMany.mockResolvedValue([{ id: 'warehouse-1' }]);
		tx.productBatch.upsert.mockResolvedValue({ id: 'batch-existing' });
		tx.purchaseLine.update.mockResolvedValue({});
		tx.stock.findUnique.mockResolvedValue({
			id: 'stock-1',
			qty: new Prisma.Decimal(5),
			avgCost: 1000n,
		});
		tx.stock.update.mockResolvedValue({});
		tx.stockMovement.create.mockResolvedValue({});
		tx.purchase.update.mockResolvedValue(
			completedResponse({
				...purchase,
				lines: [{ ...purchase.lines[0], batchId: 'batch-existing' }],
			}),
		);

		await service.complete(
			'tenant-1',
			'user-1',
			'purchase-1',
			'2b6f99c0-bb7b-4df5-8b08-ef9ce38b8550',
		);

		expect(tx.productBatch.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				update: expect.objectContaining({
					qtyOnHand: { increment: purchase.lines[0].qtyBase },
				}),
			}),
		);
	});

	it('rejects complete when pesticide lacks batchCode', async () => {
		const { service, tx } = makeService();
		const purchase = draftPurchase({
			lines: [
				lineFields({
					qty: new Prisma.Decimal(1),
					qtyBase: new Prisma.Decimal(1),
					lineTotal: 1000n,
					batchCode: null,
					expiresAt: new Date('2099-01-01'),
				}),
			],
		});
		tx.purchase.findFirst.mockResolvedValue(purchase);
		tx.warehouse.findMany.mockResolvedValue([{ id: 'warehouse-1' }]);

		await expect(
			service.complete(
				'tenant-1',
				'user-1',
				'purchase-1',
				'2b6f99c0-bb7b-4df5-8b08-ef9ce38b8550',
			),
		).rejects.toMatchObject({ response: { reason: 'BATCH_REQUIRED' } });
		expect(tx.productBatch.upsert).not.toHaveBeenCalled();
		expect(tx.stock.create).not.toHaveBeenCalled();
		expect(tx.stock.update).not.toHaveBeenCalled();
	});

	it('rejects complete when inbound expiry is past', async () => {
		const { service, tx } = makeService();
		const purchase = draftPurchase({
			lines: [
				lineFields({
					qty: new Prisma.Decimal(1),
					qtyBase: new Prisma.Decimal(1),
					lineTotal: 1000n,
					batchCode: 'LOT-OLD',
					expiresAt: new Date('2001-01-01'),
				}),
			],
		});
		tx.purchase.findFirst.mockResolvedValue(purchase);
		tx.warehouse.findMany.mockResolvedValue([{ id: 'warehouse-1' }]);

		await expect(
			service.complete(
				'tenant-1',
				'user-1',
				'purchase-1',
				'2b6f99c0-bb7b-4df5-8b08-ef9ce38b8550',
			),
		).rejects.toMatchObject({
			response: { reason: 'BATCH_EXPIRED_INBOUND' },
		});
		expect(tx.productBatch.upsert).not.toHaveBeenCalled();
	});

	it('scopes batch upsert with tenantId warehouse product batchCode', async () => {
		const { service, tx } = makeService();
		const purchase = draftPurchase();
		tx.purchase.findFirst.mockResolvedValue(purchase);
		tx.warehouse.findMany.mockResolvedValue([{ id: 'warehouse-1' }]);
		tx.productBatch.upsert.mockResolvedValue({ id: 'batch-1' });
		tx.purchaseLine.update.mockResolvedValue({});
		tx.stock.findUnique.mockResolvedValue(null);
		tx.stock.create.mockResolvedValue({});
		tx.stockMovement.create.mockResolvedValue({});
		tx.purchase.update.mockResolvedValue(
			completedResponse({
				...purchase,
				lines: [{ ...purchase.lines[0], batchId: 'batch-1' }],
			}),
		);

		await service.complete(
			'tenant-1',
			'user-1',
			'purchase-1',
			'2b6f99c0-bb7b-4df5-8b08-ef9ce38b8550',
		);

		const where =
			tx.productBatch.upsert.mock.calls[0][0].where
				.tenantId_productId_warehouseId_batchCode;
		expect(where).toEqual({
			tenantId: 'tenant-1',
			productId: 'product-1',
			warehouseId: 'warehouse-1',
			batchCode: 'LOT-A',
		});
	});

	it('rejects complete into a recalled batch', async () => {
		const { service, tx } = makeService();
		const purchase = draftPurchase();
		tx.purchase.findFirst.mockResolvedValue(purchase);
		tx.warehouse.findMany.mockResolvedValue([{ id: 'warehouse-1' }]);
		tx.productBatch.findFirst.mockResolvedValue({
			id: 'batch-recalled',
			isRecalled: true,
		});

		await expect(
			service.complete(
				'tenant-1',
				'user-1',
				'purchase-1',
				'2b6f99c0-bb7b-4df5-8b08-ef9ce38b8550',
			),
		).rejects.toMatchObject({
			response: { reason: 'BATCH_RECALLED_INBOUND' },
		});
		expect(tx.productBatch.upsert).not.toHaveBeenCalled();
		expect(tx.stock.create).not.toHaveBeenCalled();
	});
});
