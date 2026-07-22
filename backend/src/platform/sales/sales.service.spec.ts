import 'reflect-metadata';
import { Prisma } from '@prisma/client';
import { QuickSalePaymentMethod } from './dto/create-quick-sale.dto';
import { SalesService } from './sales.service';

describe('SalesService', () => {
	function makeService() {
		const tx = {
			sale: {
				findFirst: jest.fn(),
				create: jest.fn(),
				update: jest.fn(),
				updateMany: jest.fn(),
			},
			warehouse: { findMany: jest.fn() },
			product: { findMany: jest.fn() },
			customer: {
				findFirst: jest.fn(),
				update: jest.fn(),
				updateMany: jest.fn(),
			},
			stock: {
				findFirst: jest.fn(),
				findUnique: jest.fn(),
				updateMany: jest.fn(),
			},
			productBatch: {
				findMany: jest.fn().mockResolvedValue([]),
				updateMany: jest.fn(),
			},
			saleLineBatch: { createMany: jest.fn() },
			stockMovement: { create: jest.fn() },
			debtLedger: { create: jest.fn() },
			salesReturn: { findFirst: jest.fn() },
		};
		const prisma = {
			sale: { findMany: jest.fn(), findFirst: jest.fn(), count: jest.fn() },
			$transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
				callback(tx),
			),
		};
		const entitlements = {
			assertFeature: jest.fn().mockResolvedValue(undefined),
		};
		return {
			service: new SalesService(prisma as never, entitlements as never),
			tx,
			prisma,
			entitlements,
		};
	}

	function dto(overrides: Record<string, unknown> = {}) {
		return {
			idempotencyKey: '2b6f99c0-bb7b-4df5-8b08-ef9ce38b8550',
			paymentMethod: QuickSalePaymentMethod.CASH,
			amountPaid: 1000,
			discountAmount: 0,
			lines: [
				{
					productId: 'product-1',
					unitId: 'unit-1',
					qty: 1,
					unitPrice: 1000,
				},
			],
			...overrides,
		} as never;
	}

	function seedTx(tx: ReturnType<typeof makeService>['tx']) {
		tx.sale.findFirst.mockResolvedValue(null);
		tx.warehouse.findMany.mockResolvedValue([{ id: 'warehouse-1' }]);
		tx.product.findMany.mockResolvedValue([
			{
				id: 'product-1',
				name: 'Product',
				baseUnitId: 'unit-1',
				baseUnit: { id: 'unit-1' },
				conversions: [],
				isLocked: false,
				isRecalled: false,
				status: 'ACTIVE',
				costPrice: 400n,
			},
		]);
		tx.customer.findFirst.mockResolvedValue(null);
		tx.stock.findFirst.mockResolvedValue({ id: 'stock-1' });
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.sale.create.mockResolvedValue({
			id: 'sale-1',
			docNo: 'BH-TEST',
			subtotal: 1000n,
			discountAmount: 0n,
			total: 1000n,
			amountPaid: 1000n,
			changeAmount: 0n,
			debtAmount: 0n,
			paymentMethod: 'CASH',
			customerId: null,
			lines: [
				{
					productId: 'product-1',
					unitId: 'unit-1',
					qty: new Prisma.Decimal(1),
					qtyBase: new Prisma.Decimal(1),
					unitPrice: 1000n,
					lineTotal: 1000n,
				},
			],
		});
	}

	function quickSaleRecord(overrides: Record<string, unknown> = {}) {
		return {
			id: 'sale-1',
			docNo: 'BH-TEST',
			channel: 'QUICK_SALE',
			status: 'COMPLETED',
			customerId: null,
			subtotal: 1000n,
			discountAmount: 0n,
			total: 1000n,
			amountPaid: 1000n,
			changeAmount: 0n,
			debtAmount: 0n,
			paymentMethod: 'CASH',
			lines: [
				{
					productId: 'product-1',
					unitId: 'unit-1',
					qty: new Prisma.Decimal(1),
					qtyBase: new Prisma.Decimal(1),
					unitPrice: 1000n,
					lineTotal: 1000n,
				},
			],
			...overrides,
		};
	}

	it('creates a paid sale with stock movement in the transaction', async () => {
		const { service, tx } = makeService();
		seedTx(tx);

		const result = await service.createQuickSale('tenant-1', 'user-1', dto());

		expect(result).toEqual(
			expect.objectContaining({ docNo: 'BH-TEST', total: 1000, debtAmount: 0 }),
		);
		expect(tx.stock.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					qty: { gte: expect.any(Prisma.Decimal) },
				}),
			}),
		);
		expect(tx.stockMovement.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ reason: 'SALE', direction: 'OUT' }),
			}),
		);
	});

	it('rejects unpaid anonymous checkout before stock mutation', async () => {
		const { service, tx } = makeService();
		seedTx(tx);

		await expect(
			service.createQuickSale(
				'tenant-1',
				'user-1',
				dto({ paymentMethod: QuickSalePaymentMethod.DEBT, amountPaid: 0 }),
			),
		).rejects.toMatchObject({ response: { reason: 'INVALID_CUSTOMER' } });
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
	});

	it('rejects an unsellable product before persistence', async () => {
		const { service, tx } = makeService();
		seedTx(tx);
		tx.product.findMany.mockResolvedValueOnce([
			{
				id: 'product-1',
				name: 'Locked',
				baseUnitId: 'unit-1',
				baseUnit: { id: 'unit-1' },
				conversions: [],
				isLocked: true,
				isRecalled: false,
				status: 'ACTIVE',
				costPrice: 400n,
			},
		]);

		await expect(
			service.createQuickSale('tenant-1', 'user-1', dto()),
		).rejects.toMatchObject({
			response: { reason: 'PRODUCT_UNSELLABLE' },
		});
		expect(tx.sale.create).not.toHaveBeenCalled();
	});

	it('replays an equivalent quick sale without duplicate persistence', async () => {
		const { service, tx } = makeService();
		seedTx(tx);
		tx.sale.findFirst.mockResolvedValue({
			id: 'sale-1',
			docNo: 'BH-TEST',
			channel: 'QUICK_SALE',
			status: 'COMPLETED',
			subtotal: 1000n,
			customerId: null,
			discountAmount: 0n,
			total: 1000n,
			amountPaid: 1000n,
			changeAmount: 0n,
			debtAmount: 0n,
			paymentMethod: 'CASH',
			lines: [
				{
					productId: 'product-1',
					unitId: 'unit-1',
					qty: new Prisma.Decimal(1),
					qtyBase: new Prisma.Decimal(1),
					unitPrice: 1000n,
					lineTotal: 1000n,
				},
			],
		});

		await expect(
			service.createQuickSale('tenant-1', 'user-1', dto()),
		).resolves.toMatchObject({ id: 'sale-1', total: 1000 });
		expect(tx.sale.create).not.toHaveBeenCalled();
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
	});

	it('rejects an ORDER record reusing a quick-sale idempotency key', async () => {
		const { service, tx } = makeService();
		seedTx(tx);
		tx.sale.findFirst.mockResolvedValue({
			id: 'order-1',
			docNo: 'BH-ORDER',
			channel: 'ORDER',
			status: 'COMPLETED',
			customerId: null,
			subtotal: 1000n,
			discountAmount: 0n,
			total: 1000n,
			amountPaid: 1000n,
			changeAmount: 0n,
			debtAmount: 0n,
			paymentMethod: 'CASH',
			lines: [
				{
					productId: 'product-1',
					unitId: 'unit-1',
					qty: new Prisma.Decimal(1),
					qtyBase: new Prisma.Decimal(1),
					unitPrice: 1000n,
					lineTotal: 1000n,
				},
			],
		});

		await expect(
			service.createQuickSale('tenant-1', 'user-1', dto()),
		).rejects.toMatchObject({ response: { reason: 'IDEMPOTENCY_CONFLICT' } });
		expect(tx.sale.create).not.toHaveBeenCalled();
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
		expect(tx.stockMovement.create).not.toHaveBeenCalled();
	});

	it('retries quick-sale P2034 and completes on the next Serializable attempt', async () => {
		const { service, tx, prisma } = makeService();
		seedTx(tx);
		prisma.$transaction
			.mockRejectedValueOnce(
				new Prisma.PrismaClientKnownRequestError('serialization conflict', {
					code: 'P2034',
					clientVersion: 'test',
				}),
			)
			.mockImplementationOnce(
				async (callback: (client: typeof tx) => unknown) => callback(tx),
			);

		await expect(
			service.createQuickSale('tenant-1', 'user-1', dto()),
		).resolves.toMatchObject({ id: 'sale-1' });
		expect(prisma.$transaction).toHaveBeenCalledTimes(2);
		expect(prisma.$transaction).toHaveBeenLastCalledWith(expect.any(Function), {
			isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
		});
	});

	it('retries a scoped quick-sale idempotency P2002 and replays equivalent state', async () => {
		const { service, tx, prisma } = makeService();
		const collision = new Prisma.PrismaClientKnownRequestError(
			'idempotency collision',
			{
				code: 'P2002',
				clientVersion: 'test',
				meta: { target: ['tenantId', 'idempotencyKey'] },
			},
		);
		prisma.$transaction
			.mockRejectedValueOnce(collision)
			.mockImplementationOnce(
				async (callback: (client: typeof tx) => unknown) => callback(tx),
			);
		tx.sale.findFirst.mockResolvedValue(quickSaleRecord());

		await expect(
			service.createQuickSale('tenant-1', 'user-1', dto()),
		).resolves.toMatchObject({ id: 'sale-1', total: 1000 });
		expect(prisma.$transaction).toHaveBeenCalledTimes(2);
		expect(tx.sale.create).not.toHaveBeenCalled();
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
	});

	it('returns typed conflict when P2002 retry finds mismatched quick-sale state', async () => {
		const { service, tx, prisma } = makeService();
		prisma.$transaction
			.mockRejectedValueOnce(
				new Prisma.PrismaClientKnownRequestError('idempotency collision', {
					code: 'P2002',
					clientVersion: 'test',
					meta: { target: ['tenantId', 'idempotencyKey'] },
				}),
			)
			.mockImplementationOnce(
				async (callback: (client: typeof tx) => unknown) => callback(tx),
			);
		tx.sale.findFirst.mockResolvedValue(
			quickSaleRecord({ discountAmount: 1n }),
		);

		await expect(
			service.createQuickSale('tenant-1', 'user-1', dto()),
		).rejects.toMatchObject({ response: { reason: 'IDEMPOTENCY_CONFLICT' } });
		expect(prisma.$transaction).toHaveBeenCalledTimes(2);
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
	});

	it('maps scoped quick-sale P2002 exhaustion to conflict after three attempts', async () => {
		const { service, prisma } = makeService();
		prisma.$transaction.mockRejectedValue(
			new Prisma.PrismaClientKnownRequestError('idempotency collision', {
				code: 'P2002',
				clientVersion: 'test',
				meta: { target: ['tenantId', 'idempotencyKey'] },
			}),
		);

		await expect(
			service.createQuickSale('tenant-1', 'user-1', dto()),
		).rejects.toMatchObject({
			status: 409,
			response: { reason: 'SERIALIZATION_CONFLICT' },
		});
		expect(prisma.$transaction).toHaveBeenCalledTimes(3);
	});

	it('does not retry unrelated quick-sale P2002 errors', async () => {
		const { service, prisma } = makeService();
		const error = new Prisma.PrismaClientKnownRequestError(
			'doc number collision',
			{
				code: 'P2002',
				clientVersion: 'test',
				meta: { target: ['tenantId', 'docNo'] },
			},
		);
		prisma.$transaction.mockRejectedValue(error);

		await expect(
			service.createQuickSale('tenant-1', 'user-1', dto()),
		).rejects.toBe(error);
		expect(prisma.$transaction).toHaveBeenCalledTimes(1);
	});
	function orderDto(overrides: Record<string, unknown> = {}) {
		return {
			idempotencyKey: '2b6f99c0-bb7b-4df5-8b08-ef9ce38b8550',
			lines: [
				{ productId: 'product-1', unitId: 'unit-1', qty: '1', unitPrice: 1000 },
			],
			status: 'DRAFT',
			discountAmount: 0,
			...overrides,
		} as never;
	}

	function draftOrder() {
		return {
			id: 'order-1',
			docNo: 'SO-TEST',
			channel: 'ORDER',
			status: 'DRAFT',
			customerId: 'customer-1',
			customerNameSnapshot: 'Alice',
			customerPhoneSnapshot: '0900',
			warehouseId: 'warehouse-1',
			subtotal: 1000n,
			discountAmount: 0n,
			total: 1000n,
			amountPaid: 0n,
			changeAmount: 0n,
			debtAmount: 0n,
			lines: [
				{
					id: 'line-1',
					productId: 'product-1',
					productNameSnapshot: 'Product',
					unitId: 'unit-1',
					qty: new Prisma.Decimal(1),
					qtyBase: new Prisma.Decimal(1),
					unitPrice: 1000n,
					lineTotal: 1000n,
				},
			],
		};
	}

	function orderWithStatus(status: 'DRAFT' | 'COMPLETED' | 'CANCELLED') {
		const sale = draftOrder();
		return {
			...sale,
			status,
			completedAt: status === 'DRAFT' ? null : new Date('2026-07-22T00:00:00Z'),
			createdAt: new Date('2026-07-21T00:00:00Z'),
			updatedAt: new Date('2026-07-22T00:00:00Z'),
			lines: sale.lines.map((line) => ({
				...line,
				unit: { id: line.unitId, name: 'Piece' },
			})),
		};
	}

	function seedOrderCreation(tx: ReturnType<typeof makeService>['tx']) {
		tx.sale.findFirst.mockResolvedValue(null);
		tx.warehouse.findMany.mockResolvedValue([{ id: 'warehouse-1' }]);
		tx.product.findMany.mockResolvedValue([
			{
				id: 'product-1',
				name: 'Product',
				baseUnitId: 'unit-1',
				conversions: [],
				isLocked: false,
				isRecalled: false,
				status: 'ACTIVE',
				costPrice: 400n,
			},
		]);
		tx.customer.findFirst.mockResolvedValue(null);
		tx.sale.create.mockResolvedValue(orderWithStatus('DRAFT'));
	}

	function replayOrder(overrides: Record<string, unknown> = {}) {
		return {
			...orderWithStatus('DRAFT'),
			idempotencyKey: orderDto().idempotencyKey,
			customerId: null,
			customerNameSnapshot: null,
			customerPhoneSnapshot: null,
			paymentMethod: null,
			note: null,
			...overrides,
		};
	}

	it('creates a draft without stock, cash, or debt side effects', async () => {
		const { service, tx } = makeService();
		tx.sale.findFirst.mockResolvedValue(null);
		tx.warehouse.findMany.mockResolvedValue([{ id: 'warehouse-1' }]);
		tx.product.findMany.mockResolvedValue([
			{
				id: 'product-1',
				name: 'Product',
				baseUnitId: 'unit-1',
				baseUnit: { id: 'unit-1' },
				conversions: [],
				isLocked: false,
				isRecalled: false,
				status: 'ACTIVE',
				costPrice: 400n,
			},
		]);
		tx.sale.create.mockResolvedValue(draftOrder());
		const result = await service.createOrder('tenant-1', 'user-1', orderDto());
		expect(result).toEqual(
			expect.objectContaining({ status: 'DRAFT', total: 1000 }),
		);
		expect(tx.stock.findUnique).not.toHaveBeenCalled();
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
		expect(tx.stockMovement.create).not.toHaveBeenCalled();
		expect(tx.customer.update).not.toHaveBeenCalled();
		expect(tx.debtLedger.create).not.toHaveBeenCalled();
	});

	it('creates a valid fractional-quantity draft with exact integer money', async () => {
		const { service, tx } = makeService();
		seedOrderCreation(tx);
		const fractional = {
			...orderWithStatus('DRAFT'),
			subtotal: 500n,
			total: 500n,
			lines: [
				{
					...orderWithStatus('DRAFT').lines[0],
					qty: new Prisma.Decimal('0.5'),
					qtyBase: new Prisma.Decimal('0.5'),
					lineTotal: 500n,
				},
			],
		};
		tx.sale.create.mockResolvedValue(fractional);

		await expect(
			service.createOrder(
				'tenant-1',
				'user-1',
				orderDto({
					lines: [
						{
							productId: 'product-1',
							unitId: 'unit-1',
							qty: '0.5',
							unitPrice: 1000,
						},
					],
				}),
			),
		).resolves.toMatchObject({ total: 500, lines: [{ qty: '0.5' }] });
		expect(tx.sale.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					subtotal: 500n,
					lines: {
						create: [
							expect.objectContaining({
								qty: new Prisma.Decimal('0.5'),
								qtyBase: new Prisma.Decimal('0.5'),
								lineTotal: 500n,
							}),
						],
					},
				}),
			}),
		);
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
	});

	it.each(['0', '-1', '0.0000001'])(
		'rejects invalid order quantity %s before persistence or inventory',
		async (qty) => {
			const { service, tx } = makeService();
			seedOrderCreation(tx);

			await expect(
				service.createOrder(
					'tenant-1',
					'user-1',
					orderDto({
						lines: [
							{
								productId: 'product-1',
								unitId: 'unit-1',
								qty,
								unitPrice: 1000,
							},
						],
					}),
				),
			).rejects.toMatchObject({
				status: 422,
				response: { reason: 'INVALID_QUANTITY' },
			});
			expect(tx.sale.create).not.toHaveBeenCalled();
			expect(tx.stock.updateMany).not.toHaveBeenCalled();
			expect(tx.stockMovement.create).not.toHaveBeenCalled();
		},
	);

	it('rejects an unsafe fractional conversion before persistence', async () => {
		const { service, tx } = makeService();
		seedOrderCreation(tx);
		tx.product.findMany.mockResolvedValue([
			{
				id: 'product-1',
				name: 'Product',
				baseUnitId: 'base-unit',
				conversions: [
					{ unitId: 'unit-1', factorToBase: new Prisma.Decimal('0.333333') },
				],
				isLocked: false,
				isRecalled: false,
				status: 'ACTIVE',
				costPrice: 400n,
			},
		]);

		await expect(
			service.createOrder(
				'tenant-1',
				'user-1',
				orderDto({
					lines: [
						{
							productId: 'product-1',
							unitId: 'unit-1',
							qty: '0.333333',
							unitPrice: 3000,
						},
					],
				}),
			),
		).rejects.toMatchObject({
			status: 422,
			response: { reason: 'INVALID_QUANTITY', field: 'qtyBase' },
		});
		expect(tx.sale.create).not.toHaveBeenCalled();
	});

	it('completes a draft with one stock movement and one debt ledger entry', async () => {
		const { service, tx, entitlements } = makeService();
		const sale = draftOrder();
		const completed = {
			...orderWithStatus('COMPLETED'),
			amountPaid: 0n,
			debtAmount: 1000n,
		};
		tx.sale.findFirst
			.mockResolvedValueOnce(sale)
			.mockResolvedValueOnce(completed);
		tx.stock.findFirst.mockResolvedValue({
			id: 'stock-1',
			qty: new Prisma.Decimal(10),
		});
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.customer.updateMany.mockResolvedValue({ count: 1 });
		tx.customer.findFirst.mockResolvedValue({ balance: 1000n });
		tx.sale.updateMany.mockResolvedValue({ count: 1 });
		const result = await service.completeOrder(
			'tenant-1',
			'user-1',
			'order-1',
			{
				paymentMethod: 'DEBT',
				amountPaid: 0,
			} as never,
		);
		expect(result).toEqual(
			expect.objectContaining({
				status: 'COMPLETED',
				paymentMethod: 'DEBT',
				debtAmount: 1000,
			}),
		);
		expect(entitlements.assertFeature).toHaveBeenNthCalledWith(
			1,
			'tenant-1',
			'inventory',
			expect.anything(),
		);
		expect(entitlements.assertFeature).toHaveBeenNthCalledWith(
			2,
			'tenant-1',
			'debt',
			expect.anything(),
		);
		expect(tx.stockMovement.create).toHaveBeenCalledTimes(1);
		expect(tx.debtLedger.create).toHaveBeenCalledTimes(1);
		expect(tx.sale.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					tenantId: 'tenant-1',
					status: 'DRAFT',
				}),
			}),
		);
	});

	it('rolls back logically before debt/status writes when stock is insufficient', async () => {
		const { service, tx } = makeService();
		tx.sale.findFirst.mockResolvedValue(draftOrder());
		tx.stock.findFirst.mockResolvedValue({ id: 'stock-1' });
		tx.stock.updateMany.mockResolvedValue({ count: 0 });
		await expect(
			service.completeOrder('tenant-1', 'user-1', 'order-1', {
				paymentMethod: 'CASH',
				amountPaid: 1000,
			} as never),
		).rejects.toMatchObject({ response: { reason: 'INSUFFICIENT_STOCK' } });
		expect(tx.stockMovement.create).not.toHaveBeenCalled();
		expect(tx.customer.update).not.toHaveBeenCalled();
		expect(tx.debtLedger.create).not.toHaveBeenCalled();
		expect(tx.sale.updateMany).not.toHaveBeenCalled();
	});

	it('replays completed order completion using the transaction-local detail read', async () => {
		const { service, tx, prisma, entitlements } = makeService();
		const completed = {
			...orderWithStatus('COMPLETED'),
			amountPaid: 1000n,
			paymentMethod: 'CASH',
		};
		tx.sale.findFirst
			.mockResolvedValueOnce(completed)
			.mockResolvedValueOnce(completed);

		await expect(
			service.completeOrder('tenant-1', 'user-1', 'order-1', {
				paymentMethod: 'CASH',
				amountPaid: 1000,
			} as never),
		).resolves.toMatchObject({ status: 'COMPLETED', paymentMethod: 'CASH' });
		expect(prisma.sale.findFirst).not.toHaveBeenCalled();
		expect(entitlements.assertFeature).not.toHaveBeenCalled();
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
		expect(tx.sale.updateMany).not.toHaveBeenCalled();
	});

	it('maps completion P2034 exhaustion to SERIALIZATION_CONFLICT after three attempts', async () => {
		const { service, prisma } = makeService();
		prisma.$transaction.mockRejectedValue(
			new Prisma.PrismaClientKnownRequestError('serialization conflict', {
				code: 'P2034',
				clientVersion: 'test',
			}),
		);

		await expect(
			service.completeOrder('tenant-1', 'user-1', 'order-1', {
				paymentMethod: 'CASH',
				amountPaid: 1000,
			} as never),
		).rejects.toMatchObject({
			status: 409,
			response: { reason: 'SERIALIZATION_CONFLICT' },
		});
		expect(prisma.$transaction).toHaveBeenCalledTimes(3);
	});

	it.each([
		['paid debt', { paymentMethod: 'DEBT', amountPaid: 1 }],
		['non-cash overpayment', { paymentMethod: 'QR', amountPaid: 1001 }],
	])(
		'rejects invalid completion settlement: %s',
		async (_label, settlement) => {
			const { service, tx, entitlements } = makeService();
			tx.sale.findFirst.mockResolvedValue(draftOrder());

			await expect(
				service.completeOrder(
					'tenant-1',
					'user-1',
					'order-1',
					settlement as never,
				),
			).rejects.toMatchObject({
				status: 422,
				response: { reason: 'INVALID_PAYMENT' },
			});
			expect(entitlements.assertFeature).not.toHaveBeenCalled();
			expect(tx.stock.updateMany).not.toHaveBeenCalled();
		},
	);

	it('rejects an idempotency key reused with a different order payload', async () => {
		const { service, tx } = makeService();
		const existing = {
			...draftOrder(),
			idempotencyKey: orderDto().idempotencyKey,
		};
		tx.sale.findFirst.mockResolvedValue(existing);
		await expect(
			service.createOrder(
				'tenant-1',
				'user-1',
				orderDto({
					lines: [
						{
							productId: 'product-1',
							unitId: 'unit-1',
							qty: '1',
							unitPrice: 900,
						},
					],
				}),
			),
		).rejects.toMatchObject({ response: { reason: 'IDEMPOTENCY_CONFLICT' } });
		expect(tx.sale.create).not.toHaveBeenCalled();
	});

	it('replays an equivalent ORDER request without duplicate persistence', async () => {
		const { service, tx, prisma } = makeService();
		const existing = {
			...orderWithStatus('DRAFT'),
			idempotencyKey: orderDto().idempotencyKey,
			customerId: null,
			customerNameSnapshot: null,
			customerPhoneSnapshot: null,
			paymentMethod: null,
			note: null,
		};
		tx.sale.findFirst.mockResolvedValue(existing);

		await expect(
			service.createOrder('tenant-1', 'user-1', orderDto()),
		).resolves.toMatchObject({ id: 'order-1', status: 'DRAFT' });
		expect(tx.sale.create).not.toHaveBeenCalled();
		expect(prisma.sale.findFirst).not.toHaveBeenCalled();
	});

	it('rejects ORDER replay when normalized settlement differs', async () => {
		const { service, tx } = makeService();
		tx.sale.findFirst.mockResolvedValue({
			...orderWithStatus('COMPLETED'),
			idempotencyKey: orderDto().idempotencyKey,
			paymentMethod: 'CASH',
			amountPaid: 1000n,
			note: null,
		});

		await expect(
			service.createOrder(
				'tenant-1',
				'user-1',
				orderDto({
					status: 'COMPLETED',
					paymentMethod: 'QR',
					amountPaid: 1000,
				}),
			),
		).rejects.toMatchObject({ response: { reason: 'IDEMPOTENCY_CONFLICT' } });
		expect(tx.sale.create).not.toHaveBeenCalled();
	});

	it('replays the same completed CASH overpayment including change', async () => {
		const { service, tx } = makeService();
		const existing = replayOrder({
			status: 'COMPLETED',
			paymentMethod: 'CASH',
			amountPaid: 1000n,
			changeAmount: 500n,
			debtAmount: 0n,
		});
		tx.sale.findFirst.mockResolvedValue(existing);

		await expect(
			service.createOrder(
				'tenant-1',
				'user-1',
				orderDto({
					status: 'COMPLETED',
					paymentMethod: 'CASH',
					amountPaid: 1500,
				}),
			),
		).resolves.toMatchObject({ status: 'COMPLETED', changeAmount: 500 });
		expect(tx.sale.create).not.toHaveBeenCalled();
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
		expect(tx.debtLedger.create).not.toHaveBeenCalled();
	});

	it('rejects CASH replay with a different overpayment change', async () => {
		const { service, tx } = makeService();
		tx.sale.findFirst.mockResolvedValue(
			replayOrder({
				status: 'COMPLETED',
				paymentMethod: 'CASH',
				amountPaid: 1000n,
				changeAmount: 500n,
				debtAmount: 0n,
			}),
		);

		await expect(
			service.createOrder(
				'tenant-1',
				'user-1',
				orderDto({
					status: 'COMPLETED',
					paymentMethod: 'CASH',
					amountPaid: 1200,
				}),
			),
		).rejects.toMatchObject({ response: { reason: 'IDEMPOTENCY_CONFLICT' } });
		expect(tx.sale.create).not.toHaveBeenCalled();
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
	});

	it('compares partial-payment debt during replay', async () => {
		const { service, tx } = makeService();
		tx.sale.findFirst.mockResolvedValue(
			replayOrder({
				status: 'COMPLETED',
				paymentMethod: 'CASH',
				amountPaid: 400n,
				changeAmount: 0n,
				debtAmount: 500n,
			}),
		);

		await expect(
			service.createOrder(
				'tenant-1',
				'user-1',
				orderDto({
					status: 'COMPLETED',
					paymentMethod: 'CASH',
					amountPaid: 400,
				}),
			),
		).rejects.toMatchObject({ response: { reason: 'IDEMPOTENCY_CONFLICT' } });
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
	});

	it('replays equivalent DEBT settlement but rejects CASH zero mismatch', async () => {
		const { service, tx } = makeService();
		const existing = replayOrder({
			status: 'COMPLETED',
			paymentMethod: null,
			amountPaid: 0n,
			changeAmount: 0n,
			debtAmount: 1000n,
		});
		tx.sale.findFirst.mockResolvedValue(existing);

		await expect(
			service.createOrder(
				'tenant-1',
				'user-1',
				orderDto({
					status: 'COMPLETED',
					paymentMethod: 'DEBT',
					amountPaid: 0,
				}),
			),
		).resolves.toMatchObject({ paymentMethod: 'DEBT', debtAmount: 1000 });

		tx.sale.findFirst.mockResolvedValue(existing);
		await expect(
			service.createOrder(
				'tenant-1',
				'user-1',
				orderDto({
					status: 'COMPLETED',
					paymentMethod: 'CASH',
					amountPaid: 0,
				}),
			),
		).rejects.toMatchObject({ response: { reason: 'IDEMPOTENCY_CONFLICT' } });
		expect(tx.sale.create).not.toHaveBeenCalled();
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
	});

	it.each([
		['payment method', { paymentMethod: 'CASH' }],
		['amount field', { amountPaid: 0 }],
	])(
		'rejects DRAFT replay with forbidden %s before replay effects',
		async (_label, fields) => {
			const { service, tx } = makeService();
			tx.sale.findFirst.mockResolvedValue(replayOrder());

			await expect(
				service.createOrder('tenant-1', 'user-1', orderDto(fields)),
			).rejects.toMatchObject({
				status: 422,
				response: { reason: 'DRAFT_SETTLEMENT_FORBIDDEN' },
			});
			expect(tx.sale.create).not.toHaveBeenCalled();
			expect(tx.stock.updateMany).not.toHaveBeenCalled();
			expect(tx.stockMovement.create).not.toHaveBeenCalled();
		},
	);

	it.each([
		['missing method', { amountPaid: 0 }],
		['missing amount', { paymentMethod: 'CASH' }],
		['QR overpay', { paymentMethod: 'QR', amountPaid: 1001 }],
		[
			'bank transfer overpay',
			{ paymentMethod: 'BANK_TRANSFER', amountPaid: 1001 },
		],
	])(
		'rejects invalid completed replay settlement: %s',
		async (_label, fields) => {
			const { service, tx } = makeService();
			tx.sale.findFirst.mockResolvedValue(
				replayOrder({
					status: 'COMPLETED',
					paymentMethod: 'CASH',
					amountPaid: 1000n,
				}),
			);

			await expect(
				service.createOrder(
					'tenant-1',
					'user-1',
					orderDto({ status: 'COMPLETED', ...fields }),
				),
			).rejects.toMatchObject({
				status: 422,
				response: { reason: 'INVALID_PAYMENT' },
			});
			expect(tx.sale.create).not.toHaveBeenCalled();
			expect(tx.stock.updateMany).not.toHaveBeenCalled();
			expect(tx.stockMovement.create).not.toHaveBeenCalled();
		},
	);

	it('retries order creation P2034 twice and succeeds on the third attempt', async () => {
		const { service, tx, prisma } = makeService();
		seedOrderCreation(tx);
		const conflict = () =>
			new Prisma.PrismaClientKnownRequestError('serialization conflict', {
				code: 'P2034',
				clientVersion: 'test',
			});
		prisma.$transaction
			.mockRejectedValueOnce(conflict())
			.mockRejectedValueOnce(conflict())
			.mockImplementationOnce(
				async (callback: (client: typeof tx) => unknown) => callback(tx),
			);

		await expect(
			service.createOrder('tenant-1', 'user-1', orderDto()),
		).resolves.toMatchObject({ status: 'DRAFT' });
		expect(prisma.$transaction).toHaveBeenCalledTimes(3);
	});

	it('maps order creation P2034 exhaustion to a typed conflict', async () => {
		const { service, prisma } = makeService();
		prisma.$transaction.mockRejectedValue(
			new Prisma.PrismaClientKnownRequestError('serialization conflict', {
				code: 'P2034',
				clientVersion: 'test',
			}),
		);

		await expect(
			service.createOrder('tenant-1', 'user-1', orderDto()),
		).rejects.toMatchObject({
			status: 409,
			response: { reason: 'SERIALIZATION_CONFLICT' },
		});
		expect(prisma.$transaction).toHaveBeenCalledTimes(3);
	});

	it('retries scoped ORDER P2002 and replays equivalent state', async () => {
		const { service, tx, prisma } = makeService();
		prisma.$transaction
			.mockRejectedValueOnce(
				new Prisma.PrismaClientKnownRequestError('idempotency collision', {
					code: 'P2002',
					clientVersion: 'test',
					meta: { target: ['tenantId', 'idempotencyKey'] },
				}),
			)
			.mockImplementationOnce(
				async (callback: (client: typeof tx) => unknown) => callback(tx),
			);
		tx.sale.findFirst.mockResolvedValue(replayOrder());

		await expect(
			service.createOrder('tenant-1', 'user-1', orderDto()),
		).resolves.toMatchObject({ id: 'order-1', status: 'DRAFT' });
		expect(prisma.$transaction).toHaveBeenCalledTimes(2);
		expect(tx.sale.create).not.toHaveBeenCalled();
	});

	it('returns idempotency conflict when ORDER P2002 retry finds mismatch', async () => {
		const { service, tx, prisma } = makeService();
		prisma.$transaction
			.mockRejectedValueOnce(
				new Prisma.PrismaClientKnownRequestError('idempotency collision', {
					code: 'P2002',
					clientVersion: 'test',
					meta: { target: ['tenantId', 'idempotencyKey'] },
				}),
			)
			.mockImplementationOnce(
				async (callback: (client: typeof tx) => unknown) => callback(tx),
			);
		tx.sale.findFirst.mockResolvedValue(replayOrder({ discountAmount: 1n }));

		await expect(
			service.createOrder('tenant-1', 'user-1', orderDto()),
		).rejects.toMatchObject({ response: { reason: 'IDEMPOTENCY_CONFLICT' } });
		expect(tx.sale.create).not.toHaveBeenCalled();
	});

	it('maps scoped ORDER P2002 exhaustion and propagates unrelated P2002', async () => {
		const scoped = new Prisma.PrismaClientKnownRequestError('collision', {
			code: 'P2002',
			clientVersion: 'test',
			meta: { target: ['tenantId', 'idempotencyKey'] },
		});
		const first = makeService();
		first.prisma.$transaction.mockRejectedValue(scoped);
		await expect(
			first.service.createOrder('tenant-1', 'user-1', orderDto()),
		).rejects.toMatchObject({
			status: 409,
			response: { reason: 'SERIALIZATION_CONFLICT' },
		});
		expect(first.prisma.$transaction).toHaveBeenCalledTimes(3);

		const unrelated = new Prisma.PrismaClientKnownRequestError(
			'doc collision',
			{
				code: 'P2002',
				clientVersion: 'test',
				meta: { target: ['tenantId', 'docNo'] },
			},
		);
		const second = makeService();
		second.prisma.$transaction.mockRejectedValue(unrelated);
		await expect(
			second.service.createOrder('tenant-1', 'user-1', orderDto()),
		).rejects.toBe(unrelated);
		expect(second.prisma.$transaction).toHaveBeenCalledTimes(1);
	});

	it('matches duplicate ORDER lines as a canonical full-line multiset', async () => {
		const { service, tx } = makeService();
		tx.sale.findFirst.mockResolvedValue(
			replayOrder({
				lines: [
					{
						...draftOrder().lines[0],
						qty: new Prisma.Decimal('1.00'),
						unitPrice: 400n,
					},
					{
						...draftOrder().lines[0],
						id: 'line-2',
						qty: new Prisma.Decimal('2.0'),
						unitPrice: 300n,
					},
				],
			}),
		);
		const reversed = [
			{ productId: 'product-1', unitId: 'unit-1', qty: '2.00', unitPrice: 300 },
			{ productId: 'product-1', unitId: 'unit-1', qty: '1.0', unitPrice: 400 },
		];

		await expect(
			service.createOrder('tenant-1', 'user-1', orderDto({ lines: reversed })),
		).resolves.toMatchObject({ id: 'order-1' });
		tx.sale.findFirst.mockResolvedValue(
			replayOrder({
				lines: [
					{
						...draftOrder().lines[0],
						qty: new Prisma.Decimal(1),
						unitPrice: 400n,
					},
					{
						...draftOrder().lines[0],
						id: 'line-2',
						qty: new Prisma.Decimal(2),
						unitPrice: 300n,
					},
				],
			}),
		);
		await expect(
			service.createOrder(
				'tenant-1',
				'user-1',
				orderDto({ lines: [{ ...reversed[0], unitPrice: 301 }, reversed[1]] }),
			),
		).rejects.toMatchObject({ response: { reason: 'IDEMPOTENCY_CONFLICT' } });
	});

	it('matches duplicate quick lines as a canonical full-line multiset', async () => {
		const { service, tx } = makeService();
		tx.sale.findFirst.mockResolvedValue(
			quickSaleRecord({
				lines: [
					{
						...quickSaleRecord().lines[0],
						qty: new Prisma.Decimal(1),
						unitPrice: 400n,
					},
					{
						...quickSaleRecord().lines[0],
						qty: new Prisma.Decimal(2),
						unitPrice: 300n,
					},
				],
			}),
		);
		const reversed = [
			{ productId: 'product-1', unitId: 'unit-1', qty: 2, unitPrice: 300 },
			{ productId: 'product-1', unitId: 'unit-1', qty: 1, unitPrice: 400 },
		];
		await expect(
			service.createQuickSale('tenant-1', 'user-1', dto({ lines: reversed })),
		).resolves.toMatchObject({ id: 'sale-1' });

		await expect(
			service.createQuickSale(
				'tenant-1',
				'user-1',
				dto({ lines: [{ ...reversed[0], qty: 3 }, reversed[1]] }),
			),
		).rejects.toMatchObject({ response: { reason: 'IDEMPOTENCY_CONFLICT' } });
	});

	it('rejects quick-sale aggregate money overflow before inventory mutation', async () => {
		const { service, tx } = makeService();
		seedTx(tx);

		await expect(
			service.createQuickSale(
				'tenant-1',
				'user-1',
				dto({
					amountPaid: 0,
					lines: [
						{
							productId: 'product-1',
							unitId: 'unit-1',
							qty: 2,
							unitPrice: Number.MAX_SAFE_INTEGER,
						},
					],
				}),
			),
		).rejects.toMatchObject({
			status: 422,
			response: { reason: 'MONEY_OUT_OF_RANGE', field: 'lineTotal' },
		});
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
		expect(tx.stockMovement.create).not.toHaveBeenCalled();
		expect(tx.sale.create).not.toHaveBeenCalled();
	});

	it('lists only ORDER sales with deterministic paging and search', async () => {
		const { service, prisma } = makeService();
		prisma.sale.findMany.mockResolvedValue([
			{
				id: 'order-1',
				docNo: 'BH-ORDER',
				status: 'DRAFT',
				customerNameSnapshot: 'Alice',
				customerPhoneSnapshot: '0900',
				total: 1200n,
				paymentMethod: null,
				soldAt: new Date('2026-01-02'),
				createdAt: new Date('2026-01-01'),
			},
		]);
		prisma.sale.count.mockResolvedValue(1);

		await expect(
			service.listOrders('tenant-a', {
				search: 'alice',
				page: 2,
				pageSize: 20,
			} as never),
		).resolves.toMatchObject({
			total: 1,
			page: 2,
			pageSize: 20,
			items: [{ id: 'order-1', itemCount: 0, total: 1200 }],
		});
		expect(prisma.sale.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					tenantId: 'tenant-a',
					channel: 'ORDER',
					deletedAt: null,
					OR: expect.any(Array),
				}),
				skip: 20,
				take: 20,
				orderBy: [{ soldAt: 'desc' }, { id: 'desc' }],
			}),
		);
	});

	it('does not enumerate foreign or quick-sale records in detail lookup', async () => {
		const { service, prisma } = makeService();
		prisma.sale.findFirst.mockResolvedValue(null);
		await expect(
			service.findOrder('tenant-a', 'foreign-or-quick-sale'),
		).rejects.toMatchObject({ status: 404 });
		expect(prisma.sale.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					id: 'foreign-or-quick-sale',
					tenantId: 'tenant-a',
					channel: 'ORDER',
					deletedAt: null,
				},
			}),
		);
	});

	it('cancels a draft without effects and replays without a second write', async () => {
		const { service, tx, entitlements } = makeService();
		const draft = draftOrder();
		const cancelled = orderWithStatus('CANCELLED');
		tx.sale.findFirst
			.mockResolvedValueOnce(draft)
			.mockResolvedValueOnce(cancelled)
			.mockResolvedValueOnce(cancelled)
			.mockResolvedValueOnce(cancelled);
		tx.sale.updateMany.mockResolvedValue({ count: 1 });

		await expect(
			service.cancelOrder('tenant-1', 'user-1', 'order-1'),
		).resolves.toMatchObject({ id: 'order-1', status: 'CANCELLED' });
		await expect(
			service.cancelOrder('tenant-1', 'user-1', 'order-1'),
		).resolves.toEqual(expect.objectContaining({ status: 'CANCELLED' }));

		expect(tx.sale.updateMany).toHaveBeenCalledTimes(1);
		expect(tx.sale.updateMany).toHaveBeenCalledWith({
			where: {
				id: 'order-1',
				tenantId: 'tenant-1',
				channel: 'ORDER',
				status: 'DRAFT',
				deletedAt: null,
			},
			data: { status: 'CANCELLED' },
		});
		expect(entitlements.assertFeature).not.toHaveBeenCalled();
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
		expect(tx.stockMovement.create).not.toHaveBeenCalled();
		expect(tx.customer.updateMany).not.toHaveBeenCalled();
		expect(tx.debtLedger.create).not.toHaveBeenCalled();
	});

	it('compensates persisted stock for a paid completed order', async () => {
		const { service, tx, entitlements } = makeService();
		const completed = {
			...orderWithStatus('COMPLETED'),
			amountPaid: 1000n,
			debtAmount: 0n,
			paymentMethod: 'CASH',
		};
		const cancelled = { ...completed, status: 'CANCELLED' };
		tx.sale.findFirst
			.mockResolvedValueOnce(completed)
			.mockResolvedValueOnce(cancelled);
		tx.salesReturn.findFirst.mockResolvedValue(null);
		tx.stock.findFirst.mockResolvedValue({ id: 'stock-1' });
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.sale.updateMany.mockResolvedValue({ count: 1 });

		await expect(
			service.cancelOrder('tenant-1', 'user-1', 'order-1'),
		).resolves.toMatchObject({ status: 'CANCELLED' });

		expect(entitlements.assertFeature).toHaveBeenCalledWith(
			'tenant-1',
			'inventory',
			expect.anything(),
		);
		expect(tx.stock.updateMany).toHaveBeenCalledWith({
			where: { id: 'stock-1', tenantId: 'tenant-1' },
			data: { qty: { increment: completed.lines[0].qtyBase } },
		});
		expect(tx.stockMovement.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				tenantId: 'tenant-1',
				direction: 'IN',
				reason: 'SALE_CANCEL',
				refType: 'SALE_CANCEL',
				refId: 'order-1',
				refLineId: 'line-1',
				createdBy: 'user-1',
			}),
		});
		expect(tx.customer.updateMany).not.toHaveBeenCalled();
	});

	it('rejects invalid persisted cancellation quantity before any compensation effect', async () => {
		const { service, tx } = makeService();
		const completed = orderWithStatus('COMPLETED');
		tx.sale.findFirst.mockResolvedValue({
			...completed,
			lines: [
				completed.lines[0],
				{
					...completed.lines[0],
					id: 'line-invalid',
					qtyBase: new Prisma.Decimal('0.0000001'),
				},
			],
		});
		tx.salesReturn.findFirst.mockResolvedValue(null);

		await expect(
			service.cancelOrder('tenant-1', 'user-1', 'order-1'),
		).rejects.toMatchObject({
			status: 422,
			response: { reason: 'INVALID_QUANTITY', field: 'qtyBase' },
		});
		expect(tx.stock.findFirst).not.toHaveBeenCalled();
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
		expect(tx.stockMovement.create).not.toHaveBeenCalled();
		expect(tx.customer.updateMany).not.toHaveBeenCalled();
		expect(tx.debtLedger.create).not.toHaveBeenCalled();
		expect(tx.sale.updateMany).not.toHaveBeenCalled();
	});

	it('compensates original debt with a tenant-scoped conditional decrement', async () => {
		const { service, tx, entitlements } = makeService();
		const completed = {
			...orderWithStatus('COMPLETED'),
			amountPaid: 400n,
			debtAmount: 600n,
			paymentMethod: 'CASH',
		};
		tx.sale.findFirst
			.mockResolvedValueOnce(completed)
			.mockResolvedValueOnce({ ...completed, status: 'CANCELLED' });
		tx.salesReturn.findFirst.mockResolvedValue(null);
		tx.stock.findFirst.mockResolvedValue({ id: 'stock-1' });
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.customer.updateMany.mockResolvedValue({ count: 1 });
		tx.customer.findFirst.mockResolvedValue({ balance: 125n });
		tx.sale.updateMany.mockResolvedValue({ count: 1 });

		await service.cancelOrder('tenant-1', 'user-1', 'order-1');

		expect(entitlements.assertFeature).toHaveBeenNthCalledWith(
			2,
			'tenant-1',
			'debt',
			expect.anything(),
		);
		expect(tx.customer.updateMany).toHaveBeenCalledWith({
			where: {
				id: 'customer-1',
				tenantId: 'tenant-1',
				deletedAt: null,
				balance: { gte: 600n },
			},
			data: { balance: { decrement: 600n } },
		});
		expect(tx.debtLedger.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				entryType: 'ADJUST',
				direction: 'DECREASE',
				amount: 600n,
				balanceAfter: 125n,
				refType: 'SALE_CANCEL',
				refId: 'order-1',
			}),
		});
	});

	it('rejects returned sales before compensation', async () => {
		const { service, tx } = makeService();
		tx.sale.findFirst.mockResolvedValue(orderWithStatus('COMPLETED'));
		tx.salesReturn.findFirst.mockResolvedValue({ id: 'return-1' });

		await expect(
			service.cancelOrder('tenant-1', 'user-1', 'order-1'),
		).rejects.toMatchObject({
			status: 409,
			response: { reason: 'SALE_ALREADY_RETURNED' },
		});
		expect(tx.salesReturn.findFirst).toHaveBeenCalledWith({
			where: {
				tenantId: 'tenant-1',
				originalSaleId: 'order-1',
				status: 'COMPLETED',
			},
			select: { id: true },
		});
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
		expect(tx.sale.updateMany).not.toHaveBeenCalled();
	});

	it('rejects unsafe debt compensation before ledger and terminal writes', async () => {
		const { service, tx } = makeService();
		const completed = { ...orderWithStatus('COMPLETED'), debtAmount: 600n };
		tx.sale.findFirst.mockResolvedValue(completed);
		tx.salesReturn.findFirst.mockResolvedValue(null);
		tx.stock.findFirst.mockResolvedValue({ id: 'stock-1' });
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.customer.updateMany.mockResolvedValue({ count: 0 });

		await expect(
			service.cancelOrder('tenant-1', 'user-1', 'order-1'),
		).rejects.toMatchObject({
			status: 409,
			response: { reason: 'DEBT_COMPENSATION_CONFLICT' },
		});
		expect(tx.debtLedger.create).not.toHaveBeenCalled();
		expect(tx.sale.updateMany).not.toHaveBeenCalled();
	});

	it('does not enumerate cross-tenant cancellation targets', async () => {
		const { service, tx } = makeService();
		tx.sale.findFirst.mockResolvedValue(null);

		await expect(
			service.cancelOrder('tenant-a', 'user-1', 'tenant-b-order'),
		).rejects.toMatchObject({ status: 404 });
		expect(tx.sale.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: {
					id: 'tenant-b-order',
					tenantId: 'tenant-a',
					channel: 'ORDER',
					deletedAt: null,
				},
			}),
		);
		expect(tx.sale.updateMany).not.toHaveBeenCalled();
	});

	it('performs no mutation when cancellation entitlement is missing', async () => {
		const { service, tx, entitlements } = makeService();
		tx.sale.findFirst.mockResolvedValue(orderWithStatus('COMPLETED'));
		tx.salesReturn.findFirst.mockResolvedValue(null);
		entitlements.assertFeature.mockRejectedValueOnce(new Error('forbidden'));

		await expect(
			service.cancelOrder('tenant-1', 'user-1', 'order-1'),
		).rejects.toThrow('forbidden');
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
		expect(tx.stockMovement.create).not.toHaveBeenCalled();
		expect(tx.customer.updateMany).not.toHaveBeenCalled();
		expect(tx.sale.updateMany).not.toHaveBeenCalled();
	});

	it('does not attempt later writes after a compensation movement failure', async () => {
		const { service, tx } = makeService();
		tx.sale.findFirst.mockResolvedValue(orderWithStatus('COMPLETED'));
		tx.salesReturn.findFirst.mockResolvedValue(null);
		tx.stock.findFirst.mockResolvedValue({ id: 'stock-1' });
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.stockMovement.create.mockRejectedValue(new Error('movement failed'));

		await expect(
			service.cancelOrder('tenant-1', 'user-1', 'order-1'),
		).rejects.toThrow('movement failed');
		expect(tx.customer.updateMany).not.toHaveBeenCalled();
		expect(tx.debtLedger.create).not.toHaveBeenCalled();
		expect(tx.sale.updateMany).not.toHaveBeenCalled();
	});

	it('retries P2034 twice and succeeds on the third serializable attempt', async () => {
		const { service, tx, prisma } = makeService();
		const conflict = () =>
			new Prisma.PrismaClientKnownRequestError('serialization conflict', {
				code: 'P2034',
				clientVersion: 'test',
			});
		prisma.$transaction
			.mockRejectedValueOnce(conflict())
			.mockRejectedValueOnce(conflict())
			.mockImplementationOnce(
				async (callback: (client: typeof tx) => unknown) => callback(tx),
			);
		tx.sale.findFirst
			.mockResolvedValueOnce(draftOrder())
			.mockResolvedValueOnce(orderWithStatus('CANCELLED'));
		tx.sale.updateMany.mockResolvedValue({ count: 1 });

		await expect(
			service.cancelOrder('tenant-1', 'user-1', 'order-1'),
		).resolves.toMatchObject({ status: 'CANCELLED' });
		expect(prisma.$transaction).toHaveBeenCalledTimes(3);
	});

	it('maps P2034 retry exhaustion to a typed conflict', async () => {
		const { service, prisma } = makeService();
		const conflict = new Prisma.PrismaClientKnownRequestError(
			'serialization conflict',
			{ code: 'P2034', clientVersion: 'test' },
		);
		prisma.$transaction.mockRejectedValue(conflict);

		await expect(
			service.cancelOrder('tenant-1', 'user-1', 'order-1'),
		).rejects.toMatchObject({
			status: 409,
			response: { reason: 'SERIALIZATION_CONFLICT' },
		});
		expect(prisma.$transaction).toHaveBeenCalledTimes(3);
	});

	it('rejects a conditional terminal race loser after compensation writes', async () => {
		const { service, tx } = makeService();
		tx.sale.findFirst.mockResolvedValue(orderWithStatus('COMPLETED'));
		tx.salesReturn.findFirst.mockResolvedValue(null);
		tx.stock.findFirst.mockResolvedValue({ id: 'stock-1' });
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.sale.updateMany.mockResolvedValue({ count: 0 });

		await expect(
			service.cancelOrder('tenant-1', 'user-1', 'order-1'),
		).rejects.toMatchObject({
			status: 409,
			response: { reason: 'CONCURRENT_MODIFICATION' },
		});
		expect(tx.stockMovement.create).toHaveBeenCalledTimes(1);
		expect(tx.sale.findFirst).toHaveBeenCalledTimes(1);
	});

	it('rejects when a retry observes completion after initially observing draft', async () => {
		const { service, tx, prisma, entitlements } = makeService();
		const conflict = () =>
			new Prisma.PrismaClientKnownRequestError('serialization conflict', {
				code: 'P2034',
				clientVersion: 'test',
			});
		let attempt = 0;
		prisma.$transaction.mockImplementation(
			async (callback: (client: typeof tx) => unknown) => {
				attempt += 1;
				const result = await callback(tx);
				if (attempt === 1) throw conflict();
				return result;
			},
		);
		tx.sale.findFirst
			.mockResolvedValueOnce(draftOrder())
			.mockResolvedValueOnce(orderWithStatus('CANCELLED'))
			.mockResolvedValueOnce(orderWithStatus('COMPLETED'));
		tx.sale.updateMany.mockResolvedValue({ count: 1 });

		await expect(
			service.cancelOrder('tenant-1', 'user-1', 'order-1'),
		).rejects.toMatchObject({
			status: 409,
			response: { reason: 'CONCURRENT_MODIFICATION' },
		});
		expect(prisma.$transaction).toHaveBeenCalledTimes(2);
		expect(tx.sale.updateMany).toHaveBeenCalledTimes(1);
		expect(tx.salesReturn.findFirst).not.toHaveBeenCalled();
		expect(entitlements.assertFeature).not.toHaveBeenCalled();
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
		expect(tx.stockMovement.create).not.toHaveBeenCalled();
	});

	it('preserves a persisted partial cash payment method in canonical detail', async () => {
		const { service, prisma } = makeService();
		prisma.sale.findFirst.mockResolvedValue({
			...orderWithStatus('COMPLETED'),
			amountPaid: 400n,
			debtAmount: 600n,
			paymentMethod: 'CASH',
		});

		await expect(
			service.findOrder('tenant-1', 'order-1'),
		).resolves.toMatchObject({
			paymentMethod: 'CASH',
			amountPaid: 400,
			debtAmount: 600,
		});
	});

	it('serializes money at the safe integer boundary', async () => {
		const { service, prisma } = makeService();
		const boundary = BigInt(Number.MAX_SAFE_INTEGER);
		const order = orderWithStatus('COMPLETED');
		prisma.sale.findFirst.mockResolvedValue({
			...order,
			subtotal: boundary,
			total: boundary,
			amountPaid: boundary,
			lines: order.lines.map((line) => ({
				...line,
				unitPrice: boundary,
				lineTotal: boundary,
			})),
		});

		await expect(
			service.findOrder('tenant-1', 'order-1'),
		).resolves.toMatchObject({
			total: Number.MAX_SAFE_INTEGER,
			amountPaid: Number.MAX_SAFE_INTEGER,
			lines: [
				{
					unitPrice: Number.MAX_SAFE_INTEGER,
					lineTotal: Number.MAX_SAFE_INTEGER,
				},
			],
		});
	});

	it('rejects unsafe money in detail and summary serialization', async () => {
		const { service, prisma } = makeService();
		const unsafe = BigInt(Number.MAX_SAFE_INTEGER) + 1n;
		prisma.sale.findFirst.mockResolvedValue({
			...orderWithStatus('COMPLETED'),
			total: unsafe,
		});
		await expect(
			service.findOrder('tenant-1', 'order-1'),
		).rejects.toMatchObject({
			status: 500,
			response: { reason: 'UNSAFE_PERSISTED_MONEY', field: 'total' },
		});

		prisma.sale.findMany.mockResolvedValue([
			{
				id: 'order-1',
				docNo: 'BH-ORDER',
				status: 'COMPLETED',
				customerNameSnapshot: null,
				customerPhoneSnapshot: null,
				total: unsafe,
				paymentMethod: 'CASH',
				soldAt: new Date(),
				createdAt: new Date(),
			},
		]);
		prisma.sale.count.mockResolvedValue(1);
		await expect(
			service.listOrders('tenant-1', {} as never),
		).rejects.toMatchObject({
			status: 500,
			response: { reason: 'UNSAFE_PERSISTED_MONEY', field: 'total' },
		});
	});

	it('denies missing debt entitlement before completed compensation effects', async () => {
		const { service, tx, entitlements } = makeService();
		tx.sale.findFirst.mockResolvedValue({
			...orderWithStatus('COMPLETED'),
			debtAmount: 600n,
		});
		tx.salesReturn.findFirst.mockResolvedValue(null);
		entitlements.assertFeature
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error('debt forbidden'));

		await expect(
			service.cancelOrder('tenant-1', 'user-1', 'order-1'),
		).rejects.toThrow('debt forbidden');
		expect(tx.stock.findFirst).not.toHaveBeenCalled();
		expect(tx.stock.updateMany).not.toHaveBeenCalled();
		expect(tx.customer.updateMany).not.toHaveBeenCalled();
		expect(tx.sale.updateMany).not.toHaveBeenCalled();
	});

	it('propagates a debt ledger failure without reaching terminal status', async () => {
		const { service, tx } = makeService();
		const completed = { ...orderWithStatus('COMPLETED'), debtAmount: 600n };
		tx.sale.findFirst.mockResolvedValue(completed);
		tx.salesReturn.findFirst.mockResolvedValue(null);
		tx.stock.findFirst.mockResolvedValue({ id: 'stock-1' });
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.customer.updateMany.mockResolvedValue({ count: 1 });
		tx.customer.findFirst.mockResolvedValue({ balance: 0n });
		tx.debtLedger.create.mockRejectedValue(new Error('ledger failed'));

		await expect(
			service.cancelOrder('tenant-1', 'user-1', 'order-1'),
		).rejects.toThrow('ledger failed');
		expect(tx.sale.updateMany).not.toHaveBeenCalled();
	});

	it.each([
		['missing stock', null, { count: 1 }, 'STOCK_COMPENSATION_CONFLICT'],
		[
			'conditional stock update loser',
			{ id: 'stock-1' },
			{ count: 0 },
			'STOCK_COMPENSATION_CONFLICT',
		],
	])(
		'rejects %s before movement creation',
		async (_label, stock, updated, reason) => {
			const { service, tx } = makeService();
			tx.sale.findFirst.mockResolvedValue(orderWithStatus('COMPLETED'));
			tx.salesReturn.findFirst.mockResolvedValue(null);
			tx.stock.findFirst.mockResolvedValue(stock);
			tx.stock.updateMany.mockResolvedValue(updated);

			await expect(
				service.cancelOrder('tenant-1', 'user-1', 'order-1'),
			).rejects.toMatchObject({ status: 409, response: { reason } });
			expect(tx.stockMovement.create).not.toHaveBeenCalled();
			expect(tx.sale.updateMany).not.toHaveBeenCalled();
		},
	);

	it('rejects when the compensated customer cannot be reread', async () => {
		const { service, tx } = makeService();
		tx.sale.findFirst.mockResolvedValue({
			...orderWithStatus('COMPLETED'),
			debtAmount: 600n,
		});
		tx.salesReturn.findFirst.mockResolvedValue(null);
		tx.stock.findFirst.mockResolvedValue({ id: 'stock-1' });
		tx.stock.updateMany.mockResolvedValue({ count: 1 });
		tx.customer.updateMany.mockResolvedValue({ count: 1 });
		tx.customer.findFirst.mockResolvedValue(null);

		await expect(
			service.cancelOrder('tenant-1', 'user-1', 'order-1'),
		).rejects.toMatchObject({
			status: 409,
			response: { reason: 'DEBT_COMPENSATION_CONFLICT' },
		});
		expect(tx.debtLedger.create).not.toHaveBeenCalled();
		expect(tx.sale.updateMany).not.toHaveBeenCalled();
	});
});
