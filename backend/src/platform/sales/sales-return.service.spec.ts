import { SalesReturnsService } from './sales-return.service';

describe('SalesReturnsService', () => {
	function setup() {
		const tx = {
			sale: { findFirst: jest.fn() },
			salesReturn: {
				findFirst: jest.fn(),
				findMany: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
			},
			stock: { updateMany: jest.fn() },
			productBatch: { findFirst: jest.fn(), updateMany: jest.fn() },
			stockMovement: { create: jest.fn() },
			customer: { updateMany: jest.fn(), findFirstOrThrow: jest.fn() },
			debtLedger: { create: jest.fn() },
			paymentVoucher: { aggregate: jest.fn(), create: jest.fn() },
		};
		const prisma = {
			$transaction: jest.fn(async (callback: (value: typeof tx) => unknown) =>
				callback(tx),
			),
			salesReturn: { findFirst: jest.fn() },
		};
		const audit = { writeInTx: jest.fn() };
		return {
			service: new SalesReturnsService(prisma as never, audit as never),
			tx,
			prisma,
			audit,
		};
	}

	const completedSale = {
		id: 'sale-1',
		status: 'COMPLETED',
		tenantId: 'tenant-1',
		warehouseId: 'warehouse-1',
		customerId: 'customer-1',
		total: 1200n,
		amountPaid: 600n,
		debtAmount: 600n,
		lines: [
			{
				id: 'line-1',
				productId: 'product-1',
				qtyBase: '4',
				lineTotal: 1200n,
				batches: [
					{ batchId: 'batch-1', qtyBase: '3' },
					{ batchId: 'batch-2', qtyBase: '1' },
				],
			},
		],
	};

	it('restores stock and allocated batches atomically on full return', async () => {
		const { service, tx, audit } = setup();
		tx.sale.findFirst.mockResolvedValue(completedSale);
		tx.salesReturn.findFirst.mockResolvedValue(null);
		tx.salesReturn.create.mockResolvedValue({ id: 'return-1' });
		tx.salesReturn.update.mockResolvedValue({
			id: 'return-1',
			total: 1200n,
			debtAdjust: 600n,
			lines: [],
		});
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.productBatch.findFirst
			.mockResolvedValueOnce({ id: 'batch-1', version: 4, healthState: 'SICK' })
			.mockResolvedValueOnce({
				id: 'batch-2',
				version: 1,
				healthState: 'SICK',
			});
		tx.productBatch.updateMany.mockResolvedValue({ count: 1 });
		tx.customer.updateMany.mockResolvedValue({ count: 1 });
		tx.customer.findFirstOrThrow.mockResolvedValue({ balance: 0n });

		await service.createFullReturn('tenant-1', 'user-1', 'sale-1', 'damaged');

		expect(tx.productBatch.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: 'batch-1', tenantId: 'tenant-1', version: 4 },
				data: expect.objectContaining({ version: { increment: 1 } }),
			}),
		);
		expect(tx.productBatch.updateMany).not.toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ healthState: 'HEALTHY' }),
			}),
		);
		expect(audit.writeInTx).toHaveBeenCalled();
	});

	it('rejects a second full return before any stock write', async () => {
		const { service, tx } = setup();
		tx.sale.findFirst.mockResolvedValue({ id: 'sale-1', status: 'COMPLETED' });
		tx.salesReturn.findFirst.mockResolvedValue({ id: 'return-1' });

		await expect(
			service.createFullReturn('tenant-1', 'user-1', 'sale-1'),
		).rejects.toMatchObject({
			response: { reason: 'SALE_ALREADY_RETURNED' },
		});
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
	});

	it('partial return restores only requested qty with CAS', async () => {
		const { service, tx, audit } = setup();
		tx.sale.findFirst.mockResolvedValue(completedSale);
		tx.salesReturn.findFirst.mockResolvedValue(null);
		tx.salesReturn.findMany.mockResolvedValue([]);
		tx.salesReturn.create.mockResolvedValue({ id: 'return-p1' });
		tx.salesReturn.update.mockResolvedValue({
			id: 'return-p1',
			total: 300n,
			debtAdjust: 150n,
			lines: [{ saleLineId: 'line-1', batchId: 'batch-1', qtyBase: '1' }],
		});
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.productBatch.findFirst.mockResolvedValue({
			id: 'batch-1',
			version: 7,
			healthState: 'QUARANTINED',
		});
		tx.productBatch.updateMany.mockResolvedValue({ count: 1 });
		tx.customer.updateMany.mockResolvedValue({ count: 1 });
		tx.customer.findFirstOrThrow.mockResolvedValue({ balance: 450n });

		const result = await service.createPartialReturn(
			'tenant-1',
			'user-1',
			'sale-1',
			{
				lines: [{ saleLineId: 'line-1', batchId: 'batch-1', qtyBase: '1' }],
			},
		);

		expect(result.id).toBe('return-p1');
		expect(tx.stock.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: { qty: { increment: expect.anything() } },
			}),
		);
		expect(tx.productBatch.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: 'batch-1', tenantId: 'tenant-1', version: 7 },
				data: expect.objectContaining({
					qtyOnHand: { increment: expect.anything() },
					version: { increment: 1 },
				}),
			}),
		);
		expect(tx.debtLedger.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					entryType: 'ADJUST',
					direction: 'DECREASE',
					amount: 150n,
				}),
			}),
		);
		expect(audit.writeInTx).toHaveBeenCalled();
		// DEBT_ADJUST_ONLY must never emit a refund voucher.
		expect(tx.paymentVoucher.create).not.toHaveBeenCalled();
		// healthState never written
		const batchUpdates = tx.productBatch.updateMany.mock.calls.map(
			(c: unknown[]) => c[0],
		);
		for (const call of batchUpdates) {
			expect(
				(call as { data: Record<string, unknown> }).data,
			).not.toHaveProperty('healthState');
		}
	});

	it('rejects over-return qty without stock mutation', async () => {
		const { service, tx } = setup();
		tx.sale.findFirst.mockResolvedValue(completedSale);
		tx.salesReturn.findFirst.mockResolvedValue(null);
		tx.salesReturn.findMany.mockResolvedValue([
			{
				id: 'prior',
				lines: [{ saleLineId: 'line-1', batchId: 'batch-1', qtyBase: '3' }],
			},
		]);

		await expect(
			service.createPartialReturn('tenant-1', 'user-1', 'sale-1', {
				lines: [{ saleLineId: 'line-1', batchId: 'batch-1', qtyBase: '1' }],
			}),
		).rejects.toMatchObject({
			response: { reason: 'RETURN_QTY_EXCEEDS_REMAINING' },
		});
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
		expect(tx.debtLedger.create).not.toHaveBeenCalled();
	});

	it('rejects stale batch CAS and does not complete debt', async () => {
		const { service, tx } = setup();
		tx.sale.findFirst.mockResolvedValue(completedSale);
		tx.salesReturn.findFirst.mockResolvedValue(null);
		tx.salesReturn.findMany.mockResolvedValue([]);
		tx.salesReturn.create.mockResolvedValue({ id: 'return-p2' });
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.productBatch.findFirst.mockResolvedValue({
			id: 'batch-1',
			version: 2,
			healthState: 'HEALTHY',
		});
		tx.productBatch.updateMany.mockResolvedValue({ count: 0 });

		await expect(
			service.createPartialReturn('tenant-1', 'user-1', 'sale-1', {
				lines: [{ saleLineId: 'line-1', batchId: 'batch-1', qtyBase: '1' }],
			}),
		).rejects.toMatchObject({
			response: { reason: 'BATCH_RETURN_CONFLICT' },
		});
		expect(tx.debtLedger.create).not.toHaveBeenCalled();
	});

	it('replays idempotent partial return without double stock write', async () => {
		const { service, tx } = setup();
		const existing = {
			id: 'return-existing',
			idempotencyKey: 'idem-1',
			lines: [],
		};
		tx.salesReturn.findFirst.mockResolvedValue(existing);

		const result = await service.createPartialReturn(
			'tenant-1',
			'user-1',
			'sale-1',
			{
				idempotencyKey: 'idem-1',
				lines: [{ saleLineId: 'line-1', batchId: 'batch-1', qtyBase: '1' }],
			},
		);

		expect(result).toEqual(existing);
		expect(tx.sale.findFirst).not.toHaveBeenCalled();
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
		expect(tx.paymentVoucher.create).not.toHaveBeenCalled();
	});

	it('rejects foreign-tenant sale as not found', async () => {
		const { service, tx } = setup();
		tx.sale.findFirst.mockResolvedValue(null);
		tx.salesReturn.findFirst.mockResolvedValue(null);

		await expect(
			service.createPartialReturn('tenant-other', 'user-1', 'sale-1', {
				lines: [{ saleLineId: 'line-1', batchId: 'batch-1', qtyBase: '1' }],
			}),
		).rejects.toMatchObject({ message: 'Sale not found' });
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
		expect(tx.paymentVoucher.create).not.toHaveBeenCalled();
	});

	it('issues a cash refund voucher without touching the customer balance', async () => {
		const { service, tx, audit } = setup();
		tx.sale.findFirst.mockResolvedValue({
			...completedSale,
			amountPaid: 1200n,
			debtAmount: 0n,
		});
		tx.salesReturn.findFirst.mockResolvedValue(null);
		tx.salesReturn.findMany.mockResolvedValue([]);
		tx.salesReturn.create.mockResolvedValue({ id: 'return-r1' });
		tx.salesReturn.update.mockResolvedValue({
			id: 'return-r1',
			total: 300n,
			debtAdjust: 0n,
			lines: [],
		});
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.productBatch.findFirst.mockResolvedValue({ id: 'batch-1', version: 3 });
		tx.productBatch.updateMany.mockResolvedValue({ count: 1 });
		tx.paymentVoucher.aggregate.mockResolvedValue({ _sum: { amount: null } });
		tx.paymentVoucher.create.mockResolvedValue({
			id: 'voucher-1',
			docNo: 'RFS-0123456789ABCDEF',
		});

		await service.createPartialReturn('tenant-1', 'user-1', 'sale-1', {
			settlementMode: 'REFUND_VOUCHER',
			lines: [{ saleLineId: 'line-1', batchId: 'batch-1', qtyBase: '1' }],
		});

		expect(tx.paymentVoucher.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					voucherType: 'PAYMENT',
					partyType: 'CUSTOMER',
					partyId: 'customer-1',
					refSaleId: 'sale-1',
					amount: 300n,
					method: 'CASH',
					idempotencyKey: 'refund:return-r1',
				}),
			}),
		);
		expect(tx.debtLedger.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					refType: 'SALE_RETURN_REFUND',
					direction: 'INCREASE',
					balanceAfter: null,
					amount: 300n,
				}),
			}),
		);
		// Refund settles cash already collected; outstanding debt is untouched.
		expect(tx.customer.updateMany).not.toHaveBeenCalled();
		expect(tx.salesReturn.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: { debtAdjust: 0n } }),
		);
		expect(audit.writeInTx).toHaveBeenCalledWith(
			tx,
			expect.objectContaining({
				action: 'SALE_REFUND',
				resource: 'payment_voucher',
				resourceId: 'voucher-1',
				after: expect.objectContaining({
					docNo: 'RFS-0123456789ABCDEF',
					amount: '300',
					method: 'CASH',
				}),
			}),
		);
	});

	it('shrinks the refund cap by refunds already issued on the sale', async () => {
		const { service, tx } = setup();
		tx.sale.findFirst.mockResolvedValue({
			...completedSale,
			amountPaid: 1200n,
			debtAmount: 0n,
		});
		tx.salesReturn.findFirst.mockResolvedValue(null);
		tx.salesReturn.findMany.mockResolvedValue([]);
		tx.salesReturn.create.mockResolvedValue({ id: 'return-r2' });
		tx.salesReturn.update.mockResolvedValue({
			id: 'return-r2',
			total: 300n,
			debtAdjust: 0n,
			lines: [],
		});
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.productBatch.findFirst.mockResolvedValue({ id: 'batch-1', version: 3 });
		tx.productBatch.updateMany.mockResolvedValue({ count: 1 });
		tx.paymentVoucher.aggregate.mockResolvedValue({ _sum: { amount: 1100n } });
		tx.paymentVoucher.create.mockResolvedValue({
			id: 'voucher-2',
			docNo: 'RFS-2',
		});

		await service.createPartialReturn('tenant-1', 'user-1', 'sale-1', {
			settlementMode: 'REFUND_VOUCHER',
			lines: [{ saleLineId: 'line-1', batchId: 'batch-1', qtyBase: '1' }],
		});

		expect(tx.paymentVoucher.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ amount: 100n }),
			}),
		);
	});

	it('rejects a refund above the amount actually paid', async () => {
		const { service, tx } = setup();
		tx.sale.findFirst.mockResolvedValue({
			...completedSale,
			amountPaid: 1200n,
			debtAmount: 0n,
		});
		tx.salesReturn.findFirst.mockResolvedValue(null);
		tx.salesReturn.findMany.mockResolvedValue([]);
		tx.salesReturn.create.mockResolvedValue({ id: 'return-r3' });
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.productBatch.findFirst.mockResolvedValue({ id: 'batch-1', version: 3 });
		tx.productBatch.updateMany.mockResolvedValue({ count: 1 });
		tx.paymentVoucher.aggregate.mockResolvedValue({ _sum: { amount: null } });

		await expect(
			service.createPartialReturn('tenant-1', 'user-1', 'sale-1', {
				settlementMode: 'REFUND_VOUCHER',
				refundAmount: '301',
				lines: [{ saleLineId: 'line-1', batchId: 'batch-1', qtyBase: '1' }],
			}),
		).rejects.toMatchObject({ response: { reason: 'REFUND_EXCEEDS_PAID' } });
		expect(tx.paymentVoucher.create).not.toHaveBeenCalled();
		expect(tx.salesReturn.update).not.toHaveBeenCalled();
	});

	it('rejects combining a refund voucher with a debt adjustment', async () => {
		const { service, tx } = setup();
		tx.sale.findFirst.mockResolvedValue({
			...completedSale,
			amountPaid: 600n,
		});
		tx.salesReturn.findFirst.mockResolvedValue(null);

		await expect(
			service.createPartialReturn('tenant-1', 'user-1', 'sale-1', {
				settlementMode: 'REFUND_VOUCHER',
				debtAdjust: '150',
				lines: [{ saleLineId: 'line-1', batchId: 'batch-1', qtyBase: '1' }],
			}),
		).rejects.toMatchObject({ response: { reason: 'SETTLEMENT_REQUIRED' } });
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
		expect(tx.paymentVoucher.create).not.toHaveBeenCalled();
	});

	it('aborts the transaction when the refund is unpayable, after the stock CAS', async () => {
		const { service, tx } = setup();
		tx.sale.findFirst.mockResolvedValue({
			...completedSale,
			amountPaid: 0n,
			debtAmount: 0n,
		});
		tx.salesReturn.findFirst.mockResolvedValue(null);
		tx.salesReturn.findMany.mockResolvedValue([]);
		tx.salesReturn.create.mockResolvedValue({ id: 'return-r4' });
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.productBatch.findFirst.mockResolvedValue({ id: 'batch-1', version: 3 });
		tx.productBatch.updateMany.mockResolvedValue({ count: 1 });
		tx.paymentVoucher.aggregate.mockResolvedValue({ _sum: { amount: null } });

		await expect(
			service.createPartialReturn('tenant-1', 'user-1', 'sale-1', {
				settlementMode: 'REFUND_VOUCHER',
				lines: [{ saleLineId: 'line-1', batchId: 'batch-1', qtyBase: '1' }],
			}),
		).rejects.toMatchObject({ response: { reason: 'REFUND_EXCEEDS_PAID' } });
		// Stock CAS ran first; the throw propagates out of the Serializable
		// transaction callback so nothing above is committed.
		expect(tx.productBatch.updateMany).toHaveBeenCalled();
		expect(tx.paymentVoucher.create).not.toHaveBeenCalled();
		expect(tx.debtLedger.create).not.toHaveBeenCalled();
		expect(tx.customer.updateMany).not.toHaveBeenCalled();
		expect(tx.salesReturn.update).not.toHaveBeenCalled();
	});
});
