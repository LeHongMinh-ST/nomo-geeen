import { PurchaseReturnsService } from './purchase-return.service';

describe('PurchaseReturnsService', () => {
	function setup() {
		const tx = {
			purchase: { findFirst: jest.fn() },
			purchaseReturn: {
				findFirst: jest.fn(),
				findMany: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
			},
			stock: { updateMany: jest.fn() },
			productBatch: { findFirst: jest.fn(), updateMany: jest.fn() },
			stockMovement: { create: jest.fn() },
			supplier: { updateMany: jest.fn(), findFirstOrThrow: jest.fn() },
			debtLedger: { create: jest.fn() },
		};
		const prisma = {
			$transaction: jest.fn(async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
			),
			purchaseReturn: { findFirst: jest.fn() },
		};
		const audit = { writeInTx: jest.fn() };
		return {
			service: new PurchaseReturnsService(prisma as never, audit as never),
			tx,
			audit,
		};
	}

	const completedPurchase = {
		id: 'purchase-1',
		status: 'COMPLETED',
		warehouseId: 'warehouse-1',
		supplierId: 'supplier-1',
		total: 900n,
		debtAmount: 300n,
		lines: [
			{
				id: 'pline-1',
				productId: 'product-1',
				batchId: 'batch-1',
				qtyBase: '3',
				lineTotal: 900n,
			},
		],
	};

	it('decrements stock and the received batch atomically on full return', async () => {
		const { service, tx, audit } = setup();
		tx.purchase.findFirst.mockResolvedValue({
			...completedPurchase,
			debtAmount: 0n,
		});
		tx.purchaseReturn.findFirst.mockResolvedValue(null);
		tx.purchaseReturn.create.mockResolvedValue({ id: 'return-1' });
		tx.purchaseReturn.update.mockResolvedValue({
			id: 'return-1',
			total: 900n,
			debtAdjust: 0n,
			lines: [],
		});
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.productBatch.findFirst.mockResolvedValue({ id: 'batch-1', version: 2 });
		tx.productBatch.updateMany.mockResolvedValue({ count: 1 });

		await service.createFullReturn('tenant-1', 'user-1', 'purchase-1');

		expect(tx.productBatch.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: 'batch-1',
					version: 2,
					qtyOnHand: { gte: expect.anything() },
				}),
				data: expect.objectContaining({ version: { increment: 1 } }),
			}),
		);
		expect(audit.writeInTx).toHaveBeenCalled();
	});

	it('rejects duplicate full return before stock mutation', async () => {
		const { service, tx } = setup();
		tx.purchase.findFirst.mockResolvedValue({
			id: 'purchase-1',
			status: 'COMPLETED',
		});
		tx.purchaseReturn.findFirst.mockResolvedValue({ id: 'return-1' });

		await expect(
			service.createFullReturn('tenant-1', 'user-1', 'purchase-1'),
		).rejects.toMatchObject({
			response: { reason: 'PURCHASE_ALREADY_RETURNED' },
		});
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
	});

	it('partial purchase return decrements only requested qty', async () => {
		const { service, tx, audit } = setup();
		tx.purchase.findFirst.mockResolvedValue(completedPurchase);
		tx.purchaseReturn.findFirst.mockResolvedValue(null);
		tx.purchaseReturn.findMany.mockResolvedValue([]);
		tx.purchaseReturn.create.mockResolvedValue({ id: 'prt-1' });
		tx.purchaseReturn.update.mockResolvedValue({
			id: 'prt-1',
			total: 300n,
			debtAdjust: 100n,
			lines: [],
		});
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.productBatch.findFirst.mockResolvedValue({ id: 'batch-1', version: 5 });
		tx.productBatch.updateMany.mockResolvedValue({ count: 1 });
		tx.supplier.updateMany.mockResolvedValue({ count: 1 });
		tx.supplier.findFirstOrThrow.mockResolvedValue({ balance: 200n });

		await service.createPartialReturn('tenant-1', 'user-1', 'purchase-1', {
			lines: [{ purchaseLineId: 'pline-1', qtyBase: '1' }],
		});

		expect(tx.stock.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ productId: 'product-1' }),
				data: { qty: { decrement: expect.anything() } },
			}),
		);
		expect(tx.debtLedger.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					partyType: 'SUPPLIER',
					amount: 100n,
					refType: 'PURCHASE_RETURN',
				}),
			}),
		);
		expect(audit.writeInTx).toHaveBeenCalled();
	});

	it('rejects over-return on purchase partial', async () => {
		const { service, tx } = setup();
		tx.purchase.findFirst.mockResolvedValue(completedPurchase);
		tx.purchaseReturn.findFirst.mockResolvedValue(null);
		tx.purchaseReturn.findMany.mockResolvedValue([
			{
				lines: [
					{
						purchaseLineId: 'pline-1',
						batchId: 'batch-1',
						qtyBase: '3',
					},
				],
			},
		]);

		await expect(
			service.createPartialReturn('tenant-1', 'user-1', 'purchase-1', {
				lines: [{ purchaseLineId: 'pline-1', qtyBase: '1' }],
			}),
		).rejects.toMatchObject({
			response: { reason: 'RETURN_QTY_EXCEEDS_REMAINING' },
		});
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
	});

	it('rejects stale CAS on purchase partial', async () => {
		const { service, tx } = setup();
		tx.purchase.findFirst.mockResolvedValue(completedPurchase);
		tx.purchaseReturn.findFirst.mockResolvedValue(null);
		tx.purchaseReturn.findMany.mockResolvedValue([]);
		tx.purchaseReturn.create.mockResolvedValue({ id: 'prt-2' });
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.productBatch.findFirst.mockResolvedValue({ id: 'batch-1', version: 9 });
		tx.productBatch.updateMany.mockResolvedValue({ count: 0 });

		await expect(
			service.createPartialReturn('tenant-1', 'user-1', 'purchase-1', {
				lines: [{ purchaseLineId: 'pline-1', qtyBase: '1' }],
			}),
		).rejects.toMatchObject({
			response: { reason: 'BATCH_RETURN_CONFLICT' },
		});
		expect(tx.debtLedger.create).not.toHaveBeenCalled();
	});

	it('rejects a requested batch that was not allocated to the purchase line', async () => {
		const { service, tx } = setup();
		tx.purchase.findFirst.mockResolvedValue({
			...completedPurchase,
			lines: [{ ...completedPurchase.lines[0], batchId: null }],
		});
		tx.purchaseReturn.findFirst.mockResolvedValue(null);
		tx.purchaseReturn.findMany.mockResolvedValue([]);

		await expect(
			service.createPartialReturn('tenant-1', 'user-1', 'purchase-1', {
				lines: [
					{
						purchaseLineId: 'pline-1',
						batchId: 'unrelated-batch',
						qtyBase: '1',
					},
				],
			}),
		).rejects.toMatchObject({
			response: { reason: 'BATCH_RETURN_CONFLICT' },
		});
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
	});

	it('replays purchase partial idempotency key', async () => {
		const { service, tx } = setup();
		const existing = { id: 'prt-existing', lines: [] };
		tx.purchaseReturn.findFirst.mockResolvedValue(existing);

		const result = await service.createPartialReturn(
			'tenant-1',
			'user-1',
			'purchase-1',
			{
				idempotencyKey: 'k1',
				lines: [{ purchaseLineId: 'pline-1', qtyBase: '1' }],
			},
		);
		expect(result).toEqual(existing);
		expect(tx.purchase.findFirst).not.toHaveBeenCalled();
	});

	it('fails closed for REFUND_VOUCHER on purchase', async () => {
		const { service, tx } = setup();
		tx.purchase.findFirst.mockResolvedValue({
			...completedPurchase,
			debtAmount: 0n,
		});
		tx.purchaseReturn.findFirst.mockResolvedValue(null);

		await expect(
			service.createPartialReturn('tenant-1', 'user-1', 'purchase-1', {
				settlementMode: 'REFUND_VOUCHER',
				lines: [{ purchaseLineId: 'pline-1', qtyBase: '1' }],
			}),
		).rejects.toMatchObject({
			response: { reason: 'SETTLEMENT_NOT_SUPPORTED' },
		});
	});
});
