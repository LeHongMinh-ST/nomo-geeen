import { Prisma, ProductKind } from '@prisma/client';
import { allocateFefo, resolveSaleAllocations } from './fefo-allocator';

describe('allocateFefo', () => {
	function makeTx(batches: Array<Record<string, unknown>>) {
		const updateMany = jest.fn(async ({ where }: { where: { id: string } }) => {
			const batch = batches.find((b) => b.id === where.id);
			if (!batch) return { count: 0 };
			return { count: 1 };
		});
		return {
			productBatch: {
				findMany: jest.fn(async () => batches),
				updateMany,
				aggregate: jest.fn(async () => ({
					_sum: {
						qtyOnHand: batches.reduce(
							(sum, b) => sum.add(b.qtyOnHand as Prisma.Decimal),
							new Prisma.Decimal(0),
						),
					},
				})),
			},
		};
	}

	it('allocates earliest expiry first across batches', async () => {
		const batches = [
			{
				id: 'b-late',
				expiresAt: new Date('2099-12-01'),
				createdAt: new Date('2020-01-01'),
				qtyOnHand: new Prisma.Decimal(5),
			},
			{
				id: 'b-early',
				expiresAt: new Date('2099-01-01'),
				createdAt: new Date('2020-02-01'),
				qtyOnHand: new Prisma.Decimal(3),
			},
		];
		const tx = makeTx(batches);
		const result = await allocateFefo(tx as never, {
			tenantId: 't1',
			warehouseId: 'w1',
			productId: 'p1',
			qtyBase: new Prisma.Decimal(4),
		});
		expect(result).toEqual([
			{ batchId: 'b-early', qtyBase: new Prisma.Decimal(3) },
			{ batchId: 'b-late', qtyBase: new Prisma.Decimal(1) },
		]);
		expect(tx.productBatch.updateMany).toHaveBeenCalledTimes(2);
	});

	it('skips recalled and expired via query filter (findMany where)', async () => {
		const tx = makeTx([]);
		await expect(
			allocateFefo(tx as never, {
				tenantId: 't1',
				warehouseId: 'w1',
				productId: 'p1',
				qtyBase: new Prisma.Decimal(1),
			}),
		).rejects.toMatchObject({
			response: { reason: 'INSUFFICIENT_ELIGIBLE_BATCH' },
		});
		expect(tx.productBatch.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					tenantId: 't1',
					warehouseId: 'w1',
					productId: 'p1',
					isRecalled: false,
				}),
			}),
		);
	});

	it('throws when qty insufficient after partial attempt', async () => {
		const batches = [
			{
				id: 'b1',
				expiresAt: new Date('2099-01-01'),
				createdAt: new Date('2020-01-01'),
				qtyOnHand: new Prisma.Decimal(1),
			},
		];
		const tx = makeTx(batches);
		await expect(
			allocateFefo(tx as never, {
				tenantId: 't1',
				warehouseId: 'w1',
				productId: 'p1',
				qtyBase: new Prisma.Decimal(5),
			}),
		).rejects.toMatchObject({
			response: { reason: 'INSUFFICIENT_ELIGIBLE_BATCH' },
		});
		expect(tx.productBatch.updateMany).toHaveBeenCalledTimes(1);
	});

	it('puts null expiry last', async () => {
		const batches = [
			{
				id: 'b-null',
				expiresAt: null,
				createdAt: new Date('2019-01-01'),
				qtyOnHand: new Prisma.Decimal(10),
			},
			{
				id: 'b-exp',
				expiresAt: new Date('2099-05-01'),
				createdAt: new Date('2021-01-01'),
				qtyOnHand: new Prisma.Decimal(2),
			},
		];
		const tx = makeTx(batches);
		const result = await allocateFefo(tx as never, {
			tenantId: 't1',
			warehouseId: 'w1',
			productId: 'p1',
			qtyBase: new Prisma.Decimal(3),
		});
		expect(result.map((r) => r.batchId)).toEqual(['b-exp', 'b-null']);
	});
});

describe('resolveSaleAllocations', () => {
	it('always FEFO for required-batch kinds', async () => {
		const tx = {
			productBatch: {
				findMany: jest.fn(async () => [
					{
						id: 'b1',
						expiresAt: new Date('2099-01-01'),
						createdAt: new Date(),
						qtyOnHand: new Prisma.Decimal(2),
					},
				]),
				updateMany: jest.fn(async () => ({ count: 1 })),
				aggregate: jest.fn(),
			},
		};
		const result = await resolveSaleAllocations(tx as never, {
			tenantId: 't1',
			warehouseId: 'w1',
			productId: 'p1',
			qtyBase: new Prisma.Decimal(2),
			productKind: ProductKind.PESTICIDE,
		});
		expect(result).toHaveLength(1);
		expect(tx.productBatch.aggregate).not.toHaveBeenCalled();
	});

	it('FEFO for fertilizer when batch qty exists (anti-drift)', async () => {
		const tx = {
			productBatch: {
				findMany: jest.fn(async () => [
					{
						id: 'b-fert',
						expiresAt: null,
						createdAt: new Date(),
						qtyOnHand: new Prisma.Decimal(5),
					},
				]),
				updateMany: jest.fn(async () => ({ count: 1 })),
				aggregate: jest.fn(async () => ({
					_sum: { qtyOnHand: new Prisma.Decimal(5) },
				})),
			},
		};
		const result = await resolveSaleAllocations(tx as never, {
			tenantId: 't1',
			warehouseId: 'w1',
			productId: 'p1',
			qtyBase: new Prisma.Decimal(2),
			productKind: ProductKind.FERTILIZER,
		});
		expect(result[0].batchId).toBe('b-fert');
		expect(tx.productBatch.aggregate).toHaveBeenCalled();
		expect(tx.productBatch.updateMany).toHaveBeenCalled();
	});

	it('skips FEFO for fertilizer with zero batch stock', async () => {
		const tx = {
			productBatch: {
				findMany: jest.fn(),
				updateMany: jest.fn(),
				aggregate: jest.fn(async () => ({
					_sum: { qtyOnHand: null },
				})),
			},
		};
		const result = await resolveSaleAllocations(tx as never, {
			tenantId: 't1',
			warehouseId: 'w1',
			productId: 'p1',
			qtyBase: new Prisma.Decimal(2),
			productKind: ProductKind.FERTILIZER,
		});
		expect(result).toEqual([]);
		expect(tx.productBatch.findMany).not.toHaveBeenCalled();
	});

	it('skips FEFO for OTHER kind', async () => {
		const tx = {
			productBatch: {
				findMany: jest.fn(),
				aggregate: jest.fn(),
			},
		};
		const result = await resolveSaleAllocations(tx as never, {
			tenantId: 't1',
			warehouseId: 'w1',
			productId: 'p1',
			qtyBase: new Prisma.Decimal(1),
			productKind: ProductKind.OTHER,
		});
		expect(result).toEqual([]);
	});
});
