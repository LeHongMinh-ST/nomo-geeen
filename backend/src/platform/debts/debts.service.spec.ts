import { DebtsService } from './debts.service';

describe('DebtsService', () => {
	it('creates a customer receipt and decreases debt atomically', async () => {
		const tx = {
			customer: {
				findFirst: jest
					.fn()
					.mockResolvedValue({ id: 'customer-1', balance: 1000n }),
				updateMany: jest.fn().mockResolvedValue({ count: 1 }),
			},
			paymentVoucher: {
				findFirst: jest.fn().mockResolvedValue(null),
				create: jest.fn().mockResolvedValue({
					id: 'voucher-1',
					docNo: 'PT-1',
					voucherType: 'RECEIPT',
					partyType: 'CUSTOMER',
					partyId: 'customer-1',
					amount: 400n,
					method: 'CASH',
					occurredAt: new Date(),
					note: null,
				}),
			},
			debtLedger: {
				create: jest.fn().mockResolvedValue({
					id: 'ledger-1',
					amount: 400n,
					balanceAfter: 600n,
				}),
			},
		};
		const prisma = {
			$transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
				callback(tx),
			),
		};
		const service = new DebtsService(prisma as never);
		const result = await service.createVoucher('tenant-1', 'user-1', {
			voucherType: 'RECEIPT',
			partyType: 'CUSTOMER',
			partyId: 'customer-1',
			amount: 400,
			method: 'CASH',
		});
		expect(tx.customer.updateMany).toHaveBeenCalledWith({
			where: { id: 'customer-1', tenantId: 'tenant-1', balance: { gte: 400n } },
			data: { balance: { decrement: 400n } },
		});
		expect(tx.debtLedger.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					direction: 'DECREASE',
					entryType: 'RECEIPT',
					balanceAfter: 600n,
				}),
			}),
		);
		expect(result).toEqual(
			expect.objectContaining({ amount: 400, balanceAfter: 600 }),
		);
	});

	it('rejects a supplier receipt before opening a transaction', async () => {
		const prisma = { $transaction: jest.fn() };
		const service = new DebtsService(prisma as never);
		await expect(
			service.createVoucher('tenant-1', 'user-1', {
				voucherType: 'RECEIPT',
				partyType: 'SUPPLIER',
				partyId: 'supplier-1',
				amount: 1,
				method: 'CASH',
			}),
		).rejects.toThrow('Voucher direction');
		expect(prisma.$transaction).not.toHaveBeenCalled();
	});

	it('rejects paying more than the current balance', async () => {
		const tx = {
			paymentVoucher: { findFirst: jest.fn().mockResolvedValue(null) },
			supplier: {
				findFirst: jest
					.fn()
					.mockResolvedValue({ id: 'supplier-1', balance: 100n }),
			},
		};
		const prisma = {
			$transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
				callback(tx),
			),
		};
		const service = new DebtsService(prisma as never);
		await expect(
			service.createVoucher('tenant-1', 'user-1', {
				voucherType: 'PAYMENT',
				partyType: 'SUPPLIER',
				partyId: 'supplier-1',
				amount: 101,
				method: 'BANK_TRANSFER',
			}),
		).rejects.toThrow('exceeds');
	});
	it('replays an equivalent voucher without creating another mutation', async () => {
		const existing = {
			id: 'voucher-existing',
			amount: 400n,
			partyType: 'CUSTOMER',
			partyId: 'customer-1',
			voucherType: 'RECEIPT',
			method: 'CASH',
			occurredAt: new Date('2026-07-22T00:00:00.000Z'),
			note: null,
			lines: [],
		};
		const tx = {
			paymentVoucher: {
				findFirst: jest.fn().mockResolvedValue(existing),
				create: jest.fn(),
			},
			debtLedger: {
				findFirst: jest.fn().mockResolvedValue({
					id: 'ledger-existing',
					amount: 400n,
					balanceAfter: 600n,
				}),
			},
		};
		const prisma = {
			$transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
				callback(tx),
			),
		};
		const service = new DebtsService(prisma as never);
		const result = await service.createVoucher('tenant-1', 'user-1', {
			voucherType: 'RECEIPT',
			partyType: 'CUSTOMER',
			partyId: 'customer-1',
			amount: 400,
			method: 'CASH',
			occurredAt: '2026-07-22T00:00:00.000Z',
			idempotencyKey: 'replay-key',
		});
		expect(result).toEqual(
			expect.objectContaining({ amount: 400, balanceAfter: 600 }),
		);
		expect(tx.paymentVoucher.create).not.toHaveBeenCalled();
	});

	it('rejects an idempotency key reused with a different payload', async () => {
		const tx = {
			paymentVoucher: {
				findFirst: jest.fn().mockResolvedValue({
					id: 'voucher-existing',
					amount: 400n,
					partyType: 'CUSTOMER',
					partyId: 'customer-1',
					voucherType: 'RECEIPT',
					method: 'CASH',
					occurredAt: new Date('2026-07-22T00:00:00.000Z'),
					note: null,
					lines: [],
				}),
			},
		};
		const prisma = {
			$transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
				callback(tx),
			),
		};
		const service = new DebtsService(prisma as never);
		await expect(
			service.createVoucher('tenant-1', 'user-1', {
				voucherType: 'RECEIPT',
				partyType: 'CUSTOMER',
				partyId: 'customer-1',
				amount: 401,
				method: 'CASH',
				idempotencyKey: 'replay-key',
			}),
		).rejects.toThrow('different payload');
	});
	it('paginates the merged customer and supplier stream globally', async () => {
		const customerRows = [
			{ id: 'customer-a', name: 'Alpha', balance: 1n, openingBalance: 1n },
			{ id: 'customer-c', name: 'Charlie', balance: 1n, openingBalance: 1n },
		];
		const supplierRows = [
			{
				id: 'supplier-b',
				name: 'Bravo',
				code: 'B',
				balance: 1n,
				openingBalance: 1n,
			},
			{
				id: 'supplier-d',
				name: 'Delta',
				code: 'D',
				balance: 1n,
				openingBalance: 1n,
			},
		];
		const page = (
			{ skip = 0, take }: { skip?: number; take: number },
			rows: typeof customerRows,
		) => rows.slice(skip, skip + take);
		const prisma = {
			customer: {
				findMany: jest.fn(({ take }: { take: number }) =>
					page({ take }, customerRows),
				),
				count: jest.fn().mockResolvedValue(2),
				aggregate: jest.fn().mockResolvedValue({ _sum: { balance: 2n } }),
			},
			supplier: {
				findMany: jest.fn(({ take }: { take: number }) =>
					page({ take }, supplierRows),
				),
				count: jest.fn().mockResolvedValue(2),
				aggregate: jest.fn().mockResolvedValue({ _sum: { balance: 2n } }),
			},
		};
		const service = new DebtsService(prisma as never);

		const result = await service.list('tenant-1', {
			status: 'ALL',
			page: 2,
			pageSize: 2,
		});

		expect(result.items.map((item) => item.name)).toEqual(['Charlie', 'Delta']);
		expect(prisma.customer.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ take: 4 }),
		);
		expect(prisma.supplier.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ take: 4 }),
		);
	});

	it('propagates voucher write failure so the Prisma transaction can roll back', async () => {
		const tx = {
			customer: {
				findFirst: jest
					.fn()
					.mockResolvedValue({ id: 'customer-1', balance: 1000n }),
				updateMany: jest.fn().mockResolvedValue({ count: 1 }),
			},
			paymentVoucher: {
				findFirst: jest.fn().mockResolvedValue(null),
				create: jest.fn().mockRejectedValue(new Error('voucher write failed')),
			},
			debtLedger: { create: jest.fn() },
		};
		const prisma = {
			$transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
				callback(tx),
			),
		};
		const service = new DebtsService(prisma as never);

		await expect(
			service.createVoucher('tenant-1', 'user-1', {
				voucherType: 'RECEIPT',
				partyType: 'CUSTOMER',
				partyId: 'customer-1',
				amount: 400,
				method: 'CASH',
				idempotencyKey: '55555555-5555-4555-8555-555555555555',
			}),
		).rejects.toThrow('voucher write failed');
		expect(tx.customer.updateMany).toHaveBeenCalledTimes(1);
		expect(tx.debtLedger.create).not.toHaveBeenCalled();
	});
});
