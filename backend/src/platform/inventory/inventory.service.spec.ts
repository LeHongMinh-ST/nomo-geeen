import { Prisma, ProductStatus } from '@prisma/client';
import { InventoryService } from './inventory.service';

describe('InventoryService expiry tiers', () => {
	/** Frozen clock so day-boundary maths in the service is deterministic. */
	const NOW = new Date('2026-07-26T09:30:00.000Z');

	beforeEach(() => {
		jest.useFakeTimers().setSystemTime(NOW);
	});
	afterEach(() => {
		jest.useRealTimers();
	});

	function expiryInDays(days: number): Date {
		const date = new Date('2026-07-26T00:00:00.000Z');
		date.setUTCDate(date.getUTCDate() + days);
		return date;
	}

	function batch(
		overrides: Partial<{
			id: string;
			batchCode: string;
			expiresAt: Date | null;
			qtyOnHand: Prisma.Decimal;
			warehouseId: string;
			isRecalled: boolean;
		}> = {},
	) {
		return {
			id: 'b-1',
			batchCode: 'L-001',
			expiresAt: null as Date | null,
			qtyOnHand: new Prisma.Decimal(10),
			warehouseId: 'wh-1',
			healthState: 'HEALTHY',
			version: 0,
			isRecalled: false,
			...overrides,
		};
	}

	function stockRow(
		batches: ReturnType<typeof batch>[],
		productOverrides: Partial<{
			status: ProductStatus;
			isRecalled: boolean;
		}> = {},
	) {
		return {
			productId: 'p-1',
			warehouseId: 'wh-1',
			qty: new Prisma.Decimal(10),
			avgCost: 1000n,
			updatedAt: NOW,
			product: {
				name: 'Thuốc trừ sâu A',
				sku: 'SKU-1',
				baseUnitId: 'u-1',
				baseUnit: { name: 'Chai' },
				status: ProductStatus.ACTIVE,
				isRecalled: false,
				batches,
				...productOverrides,
			},
		};
	}

	function makeService(rows: ReturnType<typeof stockRow>[]) {
		const prisma = {
			stock: {
				findMany: jest.fn().mockResolvedValue(rows),
				count: jest.fn().mockResolvedValue(rows.length),
			},
			stockMovement: { findMany: jest.fn().mockResolvedValue([]) },
		};
		return {
			service: new InventoryService(prisma as never),
			prisma,
		};
	}

	describe('list', () => {
		it('attaches a tier and daysToExpiry to every batch', async () => {
			const { service } = makeService([
				stockRow([
					batch({ id: 'b-expired', expiresAt: expiryInDays(-1) }),
					batch({ id: 'b-critical', expiresAt: expiryInDays(30) }),
					batch({ id: 'b-warning', expiresAt: expiryInDays(31) }),
					batch({ id: 'b-notice', expiresAt: expiryInDays(180) }),
					batch({ id: 'b-fresh', expiresAt: expiryInDays(181) }),
					batch({ id: 'b-none', expiresAt: null }),
				]),
			]);

			const result = await service.list('t-1', {});

			expect(
				result.items[0].batches.map((b) => [
					b.id,
					b.expiryTier,
					b.daysToExpiry,
				]),
			).toEqual([
				['b-expired', 'EXPIRED', -1],
				['b-critical', 'CRITICAL', 30],
				['b-warning', 'WARNING', 31],
				['b-notice', 'NOTICE', 180],
				['b-fresh', 'FRESH', 181],
				['b-none', 'NONE', null],
			]);
		});

		it('reports the worst tier across a product batches alongside nextExpiry', async () => {
			const { service } = makeService([
				stockRow([
					batch({ id: 'b-fresh', expiresAt: expiryInDays(200) }),
					batch({ id: 'b-critical', expiresAt: expiryInDays(5) }),
				]),
			]);

			const result = await service.list('t-1', {});

			expect(result.items[0].expiryTier).toBe('CRITICAL');
			expect(result.items[0].nextExpiry).toEqual(expiryInDays(5));
		});

		it('reports NONE when no live batch carries an expiry date', async () => {
			const { service } = makeService([
				stockRow([batch({ id: 'b-none', expiresAt: null })]),
			]);

			const result = await service.list('t-1', {});

			expect(result.items[0].expiryTier).toBe('NONE');
			expect(result.items[0].nextExpiry).toBeNull();
		});

		it('ignores batches in another warehouse or with no stock left', async () => {
			const { service } = makeService([
				stockRow([
					batch({
						id: 'b-elsewhere',
						warehouseId: 'wh-2',
						expiresAt: expiryInDays(-5),
					}),
					batch({
						id: 'b-empty',
						qtyOnHand: new Prisma.Decimal(0),
						expiresAt: expiryInDays(-5),
					}),
					batch({ id: 'b-live', expiresAt: expiryInDays(300) }),
				]),
			]);

			const result = await service.list('t-1', {});

			expect(result.items[0].batches.map((b) => b.id)).toEqual(['b-live']);
			expect(result.items[0].expiryTier).toBe('FRESH');
		});
	});

	describe('detail', () => {
		it('carries the same tier fields as the list', async () => {
			const rows = [stockRow([batch({ expiresAt: expiryInDays(0) })])];
			const prisma = {
				stock: { findFirst: jest.fn().mockResolvedValue(rows[0]) },
				stockMovement: { findMany: jest.fn().mockResolvedValue([]) },
			};
			const service = new InventoryService(prisma as never);

			const result = await service.detail('t-1', 'p-1');

			expect(result.expiryTier).toBe('CRITICAL');
			expect(result.batches[0].daysToExpiry).toBe(0);
		});
	});

	describe('expirySummary', () => {
		it('counts batches and items per tier and echoes the thresholds', async () => {
			const { service } = makeService([
				stockRow([
					batch({ id: 'b1', expiresAt: expiryInDays(-1) }),
					batch({ id: 'b2', expiresAt: expiryInDays(10) }),
				]),
				stockRow([batch({ id: 'b3', expiresAt: expiryInDays(120) })]),
				stockRow([batch({ id: 'b4', expiresAt: null })]),
			]);

			const summary = await service.expirySummary('t-1');

			expect(summary.batches).toEqual({
				total: 4,
				byTier: {
					EXPIRED: 1,
					CRITICAL: 1,
					WARNING: 0,
					NOTICE: 1,
					FRESH: 0,
					NONE: 1,
				},
			});
			// Each stock row lands in exactly one bucket, under its worst batch.
			expect(summary.items).toEqual({
				total: 3,
				byTier: {
					EXPIRED: 1,
					CRITICAL: 0,
					WARNING: 0,
					NOTICE: 1,
					FRESH: 0,
					NONE: 1,
				},
			});
			expect(summary.thresholdDays).toEqual({
				critical: 30,
				warning: 90,
				notice: 180,
			});
			expect(summary.tiers).toEqual([
				'EXPIRED',
				'CRITICAL',
				'WARNING',
				'NOTICE',
				'FRESH',
				'NONE',
			]);
			expect(summary.generatedAt).toEqual(NOW);
		});

		it('counts recalled batches, recalled products and inactive products', async () => {
			const { service } = makeService([
				stockRow([
					batch({ id: 'b1', isRecalled: true }),
					batch({ id: 'b2', isRecalled: true }),
				]),
				stockRow([batch({ id: 'b3' })], { isRecalled: true }),
				stockRow([batch({ id: 'b4' })], { status: ProductStatus.INACTIVE }),
			]);

			const summary = await service.expirySummary('t-1');

			expect(summary.recalledBatches).toBe(2);
			expect(summary.recalledItems).toBe(1);
			expect(summary.inactiveItems).toBe(1);
		});

		it('excludes batches the list would not surface', async () => {
			const { service } = makeService([
				stockRow([
					batch({ id: 'b-other-wh', warehouseId: 'wh-9', isRecalled: true }),
					batch({ id: 'b-empty', qtyOnHand: new Prisma.Decimal(0) }),
				]),
			]);

			const summary = await service.expirySummary('t-1');

			expect(summary.batches.total).toBe(0);
			expect(summary.recalledBatches).toBe(0);
			expect(summary.items.byTier.NONE).toBe(1);
		});

		it('returns a fully zeroed shape for a tenant with no stock', async () => {
			const { service } = makeService([]);

			const summary = await service.expirySummary('t-1');

			expect(summary.batches.total).toBe(0);
			expect(summary.items.total).toBe(0);
			expect(Object.values(summary.items.byTier).every((n) => n === 0)).toBe(
				true,
			);
			expect(summary.recalledBatches).toBe(0);
		});

		it('scopes the query to the tenant', async () => {
			const { service, prisma } = makeService([]);

			await service.expirySummary('t-42');

			expect(prisma.stock.findMany).toHaveBeenCalledWith(
				expect.objectContaining({ where: { tenantId: 't-42' } }),
			);
		});
	});
});
