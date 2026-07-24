import { SalesReturnsService } from './sales-return.service';

describe('SalesReturnsService', () => {
	function setup() {
		const tx = {
			sale: { findFirst: jest.fn() },
			salesReturn: {
				findFirst: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
			},
			stock: { updateMany: jest.fn() },
			productBatch: { updateMany: jest.fn() },
			stockMovement: { create: jest.fn() },
			customer: { updateMany: jest.fn(), findFirstOrThrow: jest.fn() },
			debtLedger: { create: jest.fn() },
		};
		const prisma = {
			$transaction: jest.fn(async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
			),
		};
		const audit = { writeInTx: jest.fn() };
		return { service: new SalesReturnsService(prisma as never, audit as never), tx, prisma, audit };
	}

	it('restores stock and allocated batches atomically', async () => {
		const { service, tx, audit } = setup();
		tx.sale.findFirst.mockResolvedValue({
			id: 'sale-1',
			status: 'COMPLETED',
			tenantId: 'tenant-1',
			warehouseId: 'warehouse-1',
			customerId: null,
			total: 1200n,
			debtAmount: 0n,
			lines: [
				{
					id: 'line-1',
					productId: 'product-1',
					qtyBase: '2',
					lineTotal: 1200n,
					batches: [{ batchId: 'batch-1', qtyBase: '2' }],
				},
			],
		});
		tx.salesReturn.findFirst.mockResolvedValue(null);
		tx.salesReturn.create.mockResolvedValue({ id: 'return-1' });
		tx.salesReturn.update.mockResolvedValue({
			id: 'return-1',
			total: 1200n,
			debtAdjust: 0n,
			lines: [],
		});
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.productBatch.updateMany.mockResolvedValue({ count: 1 });

		await service.createFullReturn('tenant-1', 'user-1', 'sale-1', 'damaged');

		expect(tx.stock.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ tenantId: 'tenant-1', productId: 'product-1' }),
			}),
		);
		expect(tx.productBatch.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { id: 'batch-1', tenantId: 'tenant-1' } }),
		);
		expect(tx.stockMovement.create).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ reason: 'SALE_RETURN', batchId: 'batch-1' }) }),
		);
		expect(audit.writeInTx).toHaveBeenCalled();
	});

	it('rejects a second completed return before any stock write', async () => {
		const { service, tx } = setup();
		tx.sale.findFirst.mockResolvedValue({ id: 'sale-1', status: 'COMPLETED' });
		tx.salesReturn.findFirst.mockResolvedValue({ id: 'return-1' });

		await expect(service.createFullReturn('tenant-1', 'user-1', 'sale-1')).rejects.toMatchObject({
			response: { reason: 'SALE_ALREADY_RETURNED' },
		});
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
	});
});
