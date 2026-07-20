import 'reflect-metadata';
import { Prisma } from '@prisma/client';
import { QuickSalePaymentMethod } from './dto/create-quick-sale.dto';
import { SalesService } from './sales.service';

describe('SalesService', () => {
	function makeService() {
		const tx = {
			sale: { findFirst: jest.fn(), create: jest.fn() },
			warehouse: { findMany: jest.fn() },
			product: { findMany: jest.fn() },
			customer: { findFirst: jest.fn(), update: jest.fn() },
			stock: { findFirst: jest.fn(), updateMany: jest.fn() },
			stockMovement: { create: jest.fn() },
			debtLedger: { create: jest.fn() },
		};
		const prisma = {
			$transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
				callback(tx),
			),
		};
		return { service: new SalesService(prisma as never), tx };
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
});
