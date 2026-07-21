import 'reflect-metadata';
import { Prisma } from '@prisma/client';
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
			supplier: { findFirst: jest.fn() },
			product: { findMany: jest.fn() },
			purchaseLine: { deleteMany: jest.fn() },
		};
		const prisma = {
			$transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
				callback(tx),
			),
		};
		return { service: new PurchasesService(prisma as never), tx };
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
		expect(tx).not.toHaveProperty('stock');
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
});
