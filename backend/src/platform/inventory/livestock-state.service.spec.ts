import {
	ConflictException,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import {
	AuditAction,
	LivestockHealthState,
	Prisma,
	ProductKind,
} from '@prisma/client';
import { LivestockStateService } from './livestock-state.service';

describe('LivestockStateService', () => {
	function makeService() {
		const tx = {
			productBatch: {
				findFirst: jest.fn(),
				updateMany: jest.fn(),
				findFirstOrThrow: jest.fn(),
			},
		};
		const prisma = {
			$transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
				callback(tx),
			),
		};
		const audit = { writeInTx: jest.fn() };
		return {
			service: new LivestockStateService(prisma as never, audit as never),
			tx,
			prisma,
			audit,
		};
	}

	const baseBatch = {
		id: 'batch-1',
		tenantId: 't-1',
		productId: 'p-1',
		warehouseId: 'wh-1',
		batchCode: 'L-001',
		healthState: LivestockHealthState.HEALTHY,
		version: 0,
		healthReason: null,
		healthNote: null,
		healthChangedAt: null,
		healthChangedBy: null,
		product: {
			id: 'p-1',
			productKind: ProductKind.LIVESTOCK_SEED,
			tenantId: 't-1',
		},
	};

	it('transitions HEALTHY -> QUARANTINED and writes one audit row', async () => {
		const { service, tx, audit } = makeService();
		tx.productBatch.findFirst.mockResolvedValue(baseBatch);
		tx.productBatch.updateMany.mockResolvedValue({ count: 1 });
		const after = {
			...baseBatch,
			healthState: LivestockHealthState.QUARANTINED,
			version: 1,
			healthReason: 'fever',
			healthNote: 'hold',
			healthChangedAt: new Date('2026-07-24T00:00:00.000Z'),
			healthChangedBy: 'u-1',
		};
		tx.productBatch.findFirstOrThrow.mockResolvedValue(after);

		const result = await service.changeState('t-1', 'u-1', 'batch-1', {
			toState: LivestockHealthState.QUARANTINED,
			expectedVersion: 0,
			reason: 'fever',
			note: 'hold',
		});

		expect(result.healthState).toBe(LivestockHealthState.QUARANTINED);
		expect(result.version).toBe(1);
		expect(tx.productBatch.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					id: 'batch-1',
					tenantId: 't-1',
					version: 0,
					healthState: LivestockHealthState.HEALTHY,
				}),
				data: expect.objectContaining({
					healthState: LivestockHealthState.QUARANTINED,
					version: { increment: 1 },
					healthReason: 'fever',
					healthNote: 'hold',
					healthChangedBy: 'u-1',
				}),
			}),
		);
		expect(audit.writeInTx).toHaveBeenCalledTimes(1);
		expect(audit.writeInTx).toHaveBeenCalledWith(
			tx,
			expect.objectContaining({
				tenantId: 't-1',
				actorId: 'u-1',
				action: AuditAction.LIVESTOCK_STATE_CHANGE,
				resource: 'product_batch',
				resourceId: 'batch-1',
				before: {
					healthState: LivestockHealthState.HEALTHY,
					version: 0,
					reason: null,
					note: null,
				},
				after: {
					healthState: LivestockHealthState.QUARANTINED,
					version: 1,
					reason: 'fever',
					note: 'hold',
				},
			}),
		);
	});

	it('rejects non-livestock product', async () => {
		const { service, tx, audit } = makeService();
		tx.productBatch.findFirst.mockResolvedValue({
			...baseBatch,
			product: {
				id: 'p-1',
				productKind: ProductKind.PESTICIDE,
				tenantId: 't-1',
			},
		});

		await expect(
			service.changeState('t-1', 'u-1', 'batch-1', {
				toState: LivestockHealthState.SICK,
				expectedVersion: 0,
			}),
		).rejects.toBeInstanceOf(UnprocessableEntityException);

		expect(tx.productBatch.updateMany).not.toHaveBeenCalled();
		expect(audit.writeInTx).not.toHaveBeenCalled();
	});

	it('isolates by tenant — missing batch for other tenant', async () => {
		const { service, tx, audit } = makeService();
		tx.productBatch.findFirst.mockResolvedValue(null);

		await expect(
			service.changeState('t-other', 'u-1', 'batch-1', {
				toState: LivestockHealthState.DEAD,
				expectedVersion: 0,
			}),
		).rejects.toBeInstanceOf(NotFoundException);

		expect(tx.productBatch.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: { id: 'batch-1', tenantId: 't-other' },
			}),
		);
		expect(audit.writeInTx).not.toHaveBeenCalled();
	});

	it('conflicts on stale expectedVersion', async () => {
		const { service, tx, audit } = makeService();
		tx.productBatch.findFirst.mockResolvedValue({
			...baseBatch,
			version: 3,
		});

		await expect(
			service.changeState('t-1', 'u-1', 'batch-1', {
				toState: LivestockHealthState.SICK,
				expectedVersion: 0,
			}),
		).rejects.toMatchObject({
			response: expect.objectContaining({ reason: 'STALE_VERSION' }),
		});
		expect(tx.productBatch.updateMany).not.toHaveBeenCalled();
		expect(audit.writeInTx).not.toHaveBeenCalled();
	});

	it('conflicts when updateMany loses race (count 0)', async () => {
		const { service, tx } = makeService();
		tx.productBatch.findFirst.mockResolvedValue(baseBatch);
		tx.productBatch.updateMany.mockResolvedValue({ count: 0 });

		await expect(
			service.changeState('t-1', 'u-1', 'batch-1', {
				toState: LivestockHealthState.REJECTED,
				expectedVersion: 0,
			}),
		).rejects.toBeInstanceOf(ConflictException);
	});

	it('rolls back mutation when audit write fails', async () => {
		const { service, tx, audit, prisma } = makeService();
		tx.productBatch.findFirst.mockResolvedValue(baseBatch);
		tx.productBatch.updateMany.mockResolvedValue({ count: 1 });
		tx.productBatch.findFirstOrThrow.mockResolvedValue({
			...baseBatch,
			healthState: LivestockHealthState.DEAD,
			version: 1,
		});
		audit.writeInTx.mockRejectedValue(new Error('audit down'));

		await expect(
			service.changeState('t-1', 'u-1', 'batch-1', {
				toState: LivestockHealthState.DEAD,
				expectedVersion: 0,
			}),
		).rejects.toThrow('audit down');

		// Same transaction callback — failure after update means whole tx rejects
		expect(prisma.$transaction).toHaveBeenCalled();
		expect(audit.writeInTx).toHaveBeenCalled();
	});

	it('rejects invalid transition from non-HEALTHY without audit', async () => {
		const { service, tx, audit } = makeService();
		tx.productBatch.findFirst.mockResolvedValue({
			...baseBatch,
			healthState: LivestockHealthState.QUARANTINED,
			version: 1,
		});

		await expect(
			service.changeState('t-1', 'u-1', 'batch-1', {
				toState: LivestockHealthState.HEALTHY,
				expectedVersion: 1,
			}),
		).rejects.toMatchObject({
			response: expect.objectContaining({ reason: 'INVALID_TRANSITION' }),
		});
		expect(audit.writeInTx).not.toHaveBeenCalled();
	});

	it('maps P2034 exhaustion to SERIALIZATION_CONFLICT', async () => {
		const { service, prisma } = makeService();
		prisma.$transaction.mockRejectedValue(
			new Prisma.PrismaClientKnownRequestError('conflict', {
				code: 'P2034',
				clientVersion: 'test',
			}),
		);

		await expect(
			service.changeState('t-1', 'u-1', 'batch-1', {
				toState: LivestockHealthState.SICK,
				expectedVersion: 0,
			}),
		).rejects.toMatchObject({
			response: expect.objectContaining({ reason: 'SERIALIZATION_CONFLICT' }),
		});
		expect(prisma.$transaction).toHaveBeenCalledTimes(3);
	});
});
