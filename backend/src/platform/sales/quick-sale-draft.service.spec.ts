import { QuickSaleDraftService } from './quick-sale-draft.service';

type AnyMock = jest.Mock;

interface PrismaMock {
	quickSaleDraft: {
		findFirst: AnyMock;
		findUnique: AnyMock;
		create: AnyMock;
		update: AnyMock;
	};
	quickSaleDraftLine: {
		findUnique: AnyMock;
		upsert: AnyMock;
		update: AnyMock;
		deleteMany: AnyMock;
	};
	quickSaleDraftMutation: {
		findUnique: AnyMock;
		upsert: AnyMock;
	};
	product: {
		findFirst: AnyMock;
	};
	unit: {
		findFirst: AnyMock;
	};
	customer: {
		findFirst: AnyMock;
	};
}

function buildPrisma(): PrismaMock {
	return {
		quickSaleDraft: {
			findFirst: jest.fn(),
			findUnique: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
		},
		quickSaleDraftLine: {
			findUnique: jest.fn(),
			upsert: jest.fn().mockResolvedValue({}),
			update: jest.fn().mockResolvedValue({}),
			deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
		},
		quickSaleDraftMutation: {
			findUnique: jest.fn(),
			upsert: jest.fn().mockResolvedValue({}),
		},
		product: { findFirst: jest.fn() },
		unit: { findFirst: jest.fn() },
		customer: { findFirst: jest.fn() },
	};
}

function buildDeps(prisma: PrismaMock) {
	return {
		prisma,
		audit: { log: jest.fn().mockResolvedValue(undefined) },
		events: {
			publish: jest.fn().mockResolvedValue(undefined),
			subscribe: jest.fn().mockReturnValue(() => undefined),
			connectionCount: jest.fn().mockReturnValue(0),
			isRedisBridgeReady: jest.fn().mockReturnValue(false),
		},
		sales: {
			createQuickSale: jest.fn().mockResolvedValue({
				id: 'sale-id',
				docNo: 'BH-ABC123',
				status: 'COMPLETED',
				subtotal: 100,
				discountAmount: 0,
				total: 100,
				amountPaid: 100,
				changeAmount: 0,
				debtAmount: 0,
				paymentMethod: 'CASH',
				lines: [],
			}),
		},
		entitlements: {
			assertFeature: jest.fn().mockResolvedValue(undefined),
		},
	};
}

function quickSaleDraftRow(
	overrides: Partial<{
		id: string;
		tenantId: string;
		ownerUserId: string;
		closedAt: Date | null;
		expiresAt: Date;
	}> = {},
) {
	const now = Date.now();
	return {
		id: overrides.id ?? 'draft-1',
		tenantId: overrides.tenantId ?? 'tenant-1',
		ownerUserId: overrides.ownerUserId ?? 'owner-1',
		joinToken: 'abc123',
		customerId: null,
		handbookMeta: null,
		warehouseId: null,
		lastTouchedAt: new Date(now),
		expiresAt: overrides.expiresAt ?? new Date(now + 20 * 60_000),
		closedAt: overrides.closedAt ?? null,
		closedByUserId: null,
		createdAt: new Date(now),
		updatedAt: new Date(now),
		...overrides,
	};
}

describe('QuickSaleDraftService', () => {
	describe('createOrReactivate', () => {
		it('closes any previous open draft and returns a fresh one', async () => {
			const prisma = buildPrisma();
			const deps = buildDeps(prisma);
			prisma.quickSaleDraft.findFirst
				.mockResolvedValueOnce({ id: 'old-draft' }) // previous open draft
				.mockResolvedValueOnce(null); // uniqueness probe for token
			prisma.quickSaleDraft.update.mockResolvedValueOnce({});
			prisma.quickSaleDraft.create.mockResolvedValueOnce({
				...quickSaleDraftRow({ id: 'new-draft' }),
				lines: [],
			});
			const service = new QuickSaleDraftService(
				deps.prisma as never,
				deps.audit as never,
				deps.events as never,
				deps.sales as never,
				deps.entitlements as never,
			);

			const result = await service.createOrReactivate(
				'tenant-1',
				'owner-1',
				'OWNER',
			);

			expect(result.id).toBe('new-draft');
			expect(prisma.quickSaleDraft.update).toHaveBeenCalledWith({
				where: { id: 'old-draft' },
				data: expect.objectContaining({
					closedAt: expect.any(Date),
					closedByUserId: 'owner-1',
				}),
			});
			expect(deps.events.publish).toHaveBeenCalledWith(
				expect.objectContaining({ action: 'created' }),
			);
		});
	});

	describe('addOrMergeLine', () => {
		it('replays a prior idempotent response instead of re-applying', async () => {
			const prisma = buildPrisma();
			const deps = buildDeps(prisma);
			const replaySnapshot = {
				id: 'draft-1',
				subtotal: 0,
				lines: [],
			};
			prisma.quickSaleDraftMutation.findUnique.mockResolvedValueOnce({
				responseJson: replaySnapshot,
			});
			const service = new QuickSaleDraftService(
				deps.prisma as never,
				deps.audit as never,
				deps.events as never,
				deps.sales as never,
			);

			const out = await service.addOrMergeLine(
				'tenant-1',
				'owner-1',
				'OWNER',
				'draft-1',
				{
					productId: 'p-1',
					unitId: 'u-1',
					qty: 2,
					unitPrice: 100,
					idempotencyKey: 'k-1',
				},
			);

			expect(out).toBe(replaySnapshot as never);
			expect(prisma.product.findFirst).not.toHaveBeenCalled();
			expect(prisma.quickSaleDraftLine.upsert).not.toHaveBeenCalled();
		});

		it('rejects an unknown product within the tenant', async () => {
			const prisma = buildPrisma();
			const deps = buildDeps(prisma);
			prisma.quickSaleDraftMutation.findUnique.mockResolvedValueOnce(null);
			prisma.quickSaleDraft.findFirst.mockResolvedValueOnce(
				quickSaleDraftRow({ id: 'draft-1' }),
			);
			prisma.product.findFirst.mockResolvedValueOnce(null);
			prisma.quickSaleDraft.update.mockResolvedValueOnce({
				...quickSaleDraftRow({ id: 'draft-1' }),
				lines: [],
			});
			const service = new QuickSaleDraftService(
				deps.prisma as never,
				deps.audit as never,
				deps.events as never,
				deps.sales as never,
			);

			try {
				await service.addOrMergeLine(
					'tenant-1',
					'owner-1',
					'OWNER',
					'draft-1',
					{
						productId: 'p-bad',
						unitId: 'u-1',
						qty: 2,
						unitPrice: 100,
						idempotencyKey: 'k-1',
					},
				);
				throw new Error('should have thrown');
			} catch (err) {
				expect(
					(err as { getResponse?: () => unknown }).getResponse?.(),
				).toEqual({
					reason: 'INVALID_PRODUCT',
					message: 'Product does not belong to this tenant',
				});
			}
		});

		it('rejects an inactive draft', async () => {
			const prisma = buildPrisma();
			const deps = buildDeps(prisma);
			prisma.quickSaleDraftMutation.findUnique.mockResolvedValueOnce(null);
			prisma.quickSaleDraft.findFirst.mockResolvedValueOnce(
				quickSaleDraftRow({
					id: 'draft-1',
					closedAt: new Date(),
				}),
			);
			const service = new QuickSaleDraftService(
				deps.prisma as never,
				deps.audit as never,
				deps.events as never,
				deps.sales as never,
			);

			try {
				await service.addOrMergeLine(
					'tenant-1',
					'owner-1',
					'OWNER',
					'draft-1',
					{
						productId: 'p-1',
						unitId: 'u-1',
						qty: 2,
						unitPrice: 100,
						idempotencyKey: 'k-1',
					},
				);
				throw new Error('should have thrown');
			} catch (err) {
				expect(
					(err as { getResponse?: () => unknown }).getResponse?.(),
				).toEqual({
					reason: 'DRAFT_CLOSED',
					message: 'Draft is closed',
				});
			}
		});

		it('upserts the line and emits SSE event on success', async () => {
			const prisma = buildPrisma();
			const deps = buildDeps(prisma);
			prisma.quickSaleDraftMutation.findUnique.mockResolvedValueOnce(null);
			prisma.quickSaleDraft.findFirst.mockResolvedValueOnce(
				quickSaleDraftRow({ id: 'draft-1' }),
			);
			prisma.product.findFirst.mockResolvedValueOnce({
				id: 'p-1',
				baseUnitId: 'u-1',
				baseUnit: { id: 'u-1', name: 'chai' },
				name: 'Phân bón',
			});
			prisma.quickSaleDraftLine.upsert.mockResolvedValueOnce({});
			prisma.quickSaleDraft.update.mockResolvedValueOnce({
				...quickSaleDraftRow({ id: 'draft-1' }),
				lines: [
					{
						id: 'line-1',
						productId: 'p-1',
						productNameSnapshot: 'Phân bón',
						unitId: 'u-1',
						unitNameSnapshot: 'chai',
						qty: { toString: () => '2' },
						unitPrice: 100n,
						addedByUserId: 'owner-1',
					},
				],
			});

			const service = new QuickSaleDraftService(
				deps.prisma as never,
				deps.audit as never,
				deps.events as never,
				deps.sales as never,
			);

			const result = await service.addOrMergeLine(
				'tenant-1',
				'owner-1',
				'OWNER',
				'draft-1',
				{
					productId: 'p-1',
					unitId: 'u-1',
					qty: 2,
					unitPrice: 100,
					idempotencyKey: 'k-1',
				},
			);

			expect(result.lines).toHaveLength(1);
			expect(result.lines[0]).toMatchObject({
				productId: 'p-1',
				qty: 2,
				unitPrice: 100,
				lineTotal: 200,
			});
			expect(prisma.quickSaleDraftMutation.upsert).toHaveBeenCalled();
			expect(deps.events.publish).toHaveBeenCalledWith(
				expect.objectContaining({ action: 'line-added' }),
			);
		});
	});

	describe('checkout', () => {
		it('closes the draft on successful Sale creation', async () => {
			const prisma = buildPrisma();
			const deps = buildDeps(prisma);
			prisma.quickSaleDraft.findFirst.mockResolvedValueOnce({
				...quickSaleDraftRow({ id: 'draft-1' }),
				lines: [
					{
						productId: 'p-1',
						unitId: 'u-1',
						qty: { toString: () => '1' },
						unitPrice: 100n,
						addedByUserId: 'owner-1',
					},
				],
			});
			prisma.quickSaleDraft.update.mockResolvedValueOnce({});
			const service = new QuickSaleDraftService(
				deps.prisma as never,
				deps.audit as never,
				deps.events as never,
				deps.sales as never,
			);

			const sale = await service.checkout(
				'tenant-1',
				'owner-1',
				'OWNER',
				'draft-1',
				{
					idempotencyKey: 'sale-k',
					paymentMethod: 'CASH',
					amountPaid: 100,
				},
			);

			expect(sale.id).toBe('sale-id');
			expect(deps.sales.createQuickSale).toHaveBeenCalled();
			expect(prisma.quickSaleDraft.update).toHaveBeenCalledWith({
				where: { id: 'draft-1' },
				data: expect.objectContaining({ closedByUserId: 'owner-1' }),
			});
			expect(deps.events.publish).toHaveBeenCalledWith(
				expect.objectContaining({ action: 'checked-out' }),
			);
		});

		it('rejects checkout with an empty cart', async () => {
			const prisma = buildPrisma();
			const deps = buildDeps(prisma);
			prisma.quickSaleDraft.findFirst.mockResolvedValueOnce({
				...quickSaleDraftRow({ id: 'draft-1' }),
				lines: [],
			});
			const service = new QuickSaleDraftService(
				deps.prisma as never,
				deps.audit as never,
				deps.events as never,
				deps.sales as never,
			);

			try {
				await service.checkout('tenant-1', 'owner-1', 'OWNER', 'draft-1', {
					idempotencyKey: 'sale-k',
					paymentMethod: 'CASH',
					amountPaid: 0,
				});
				throw new Error('should have thrown');
			} catch (err) {
				expect(
					(err as { getResponse?: () => unknown }).getResponse?.(),
				).toEqual({
					reason: 'CHECKOUT_FAILED',
					message: 'Cart is empty',
				});
			}
			expect(deps.sales.createQuickSale).not.toHaveBeenCalled();
		});
	});
});
