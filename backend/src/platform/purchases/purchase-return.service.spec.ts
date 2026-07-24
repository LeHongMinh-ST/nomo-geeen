import { PurchaseReturnsService } from './purchase-return.service';

describe('PurchaseReturnsService', () => {
	function setup() {
		const tx = {
			purchase: { findFirst: jest.fn() },
			purchaseReturn: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
			stock: { updateMany: jest.fn() },
			productBatch: { updateMany: jest.fn() },
			stockMovement: { create: jest.fn() },
			supplier: { updateMany: jest.fn(), findFirstOrThrow: jest.fn() },
			debtLedger: { create: jest.fn() },
		};
		const prisma = { $transaction: jest.fn(async (callback: (value: typeof tx) => unknown) => callback(tx)) };
		const audit = { writeInTx: jest.fn() };
		return { service: new PurchaseReturnsService(prisma as never, audit as never), tx, audit };
	}

	it('decrements stock and the received batch atomically', async () => {
		const { service, tx, audit } = setup();
		tx.purchase.findFirst.mockResolvedValue({
			id: 'purchase-1', status: 'COMPLETED', warehouseId: 'warehouse-1', supplierId: 'supplier-1',
			total: 900n, debtAmount: 0n,
			lines: [{ productId: 'product-1', batchId: 'batch-1', qtyBase: '3', lineTotal: 900n }],
		});
		tx.purchaseReturn.findFirst.mockResolvedValue(null);
		tx.purchaseReturn.create.mockResolvedValue({ id: 'return-1' });
		tx.purchaseReturn.update.mockResolvedValue({ id: 'return-1', total: 900n, debtAdjust: 0n, lines: [] });
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.productBatch.updateMany.mockResolvedValue({ count: 1 });

		await service.createFullReturn('tenant-1', 'user-1', 'purchase-1');

		expect(tx.stock.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ productId: 'product-1', qty: { gte: '3' } }) }));
		expect(tx.productBatch.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: 'batch-1', qtyOnHand: { gte: '3' } }) }));
		expect(tx.stockMovement.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ reason: 'PURCHASE_RETURN', direction: 'OUT' }) }));
		expect(audit.writeInTx).toHaveBeenCalled();
	});

	it('rejects duplicate return before stock mutation', async () => {
		const { service, tx } = setup();
		tx.purchase.findFirst.mockResolvedValue({ id: 'purchase-1', status: 'COMPLETED' });
		tx.purchaseReturn.findFirst.mockResolvedValue({ id: 'return-1' });

		await expect(service.createFullReturn('tenant-1', 'user-1', 'purchase-1')).rejects.toMatchObject({ response: { reason: 'PURCHASE_ALREADY_RETURNED' } });
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
	});
});
