import {
	ConflictException,
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import {
	AuditAction,
	AuditActorType,
	LivestockHealthState,
	Prisma,
} from '@prisma/client';
import { AuditLogger } from '../audit/audit-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import {
	assertLivestockProductKind,
	assertLivestockTransition,
} from './livestock-state-policy';

type Tx = Prisma.TransactionClient;

export type ChangeLivestockStateInput = {
	toState: LivestockHealthState;
	expectedVersion: number;
	reason?: string | null;
	note?: string | null;
};

export type LivestockBatchStateView = {
	id: string;
	tenantId: string;
	productId: string;
	warehouseId: string;
	batchCode: string;
	healthState: LivestockHealthState;
	version: number;
	healthReason: string | null;
	healthNote: string | null;
	healthChangedAt: Date | null;
	healthChangedBy: string | null;
};

@Injectable()
export class LivestockStateService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditLogger,
	) {}

	/**
	 * Tenant-scoped livestock health transition on ProductBatch.
	 * tenantId always from auth identity — never request body.
	 */
	async changeState(
		tenantId: string,
		userId: string,
		batchId: string,
		input: ChangeLivestockStateInput,
	): Promise<LivestockBatchStateView> {
		return this.withSerializableRetry(async (tx) => {
			const batch = await tx.productBatch.findFirst({
				where: { id: batchId, tenantId },
				include: {
					product: {
						select: { id: true, productKind: true, tenantId: true },
					},
				},
			});
			if (!batch || batch.product.tenantId !== tenantId) {
				throw new NotFoundException({
					reason: 'BATCH_NOT_FOUND',
					message: 'Product batch not found for tenant',
					field: 'batchId',
				});
			}

			assertLivestockProductKind(batch.product.productKind);
			assertLivestockTransition(batch.healthState, input.toState);

			if (batch.version !== input.expectedVersion) {
				throw new ConflictException({
					reason: 'STALE_VERSION',
					message: 'Batch version is stale; reload and retry',
					field: 'expectedVersion',
					currentVersion: batch.version,
					expectedVersion: input.expectedVersion,
				});
			}

			const reason = input.reason?.trim() || null;
			const note = input.note?.trim() || null;
			const changedAt = new Date();

			const updated = await tx.productBatch.updateMany({
				where: {
					id: batch.id,
					tenantId,
					version: input.expectedVersion,
					healthState: batch.healthState,
				},
				data: {
					healthState: input.toState,
					version: { increment: 1 },
					healthReason: reason,
					healthNote: note,
					healthChangedAt: changedAt,
					healthChangedBy: userId,
				},
			});

			if (updated.count !== 1) {
				throw new ConflictException({
					reason: 'STALE_VERSION',
					message: 'Batch version is stale; reload and retry',
					field: 'expectedVersion',
					currentVersion: batch.version,
					expectedVersion: input.expectedVersion,
				});
			}

			const after = await tx.productBatch.findFirstOrThrow({
				where: { id: batch.id, tenantId },
			});

			const beforeSnap = {
				healthState: batch.healthState,
				version: batch.version,
				reason: batch.healthReason,
				note: batch.healthNote,
			};
			const afterSnap = {
				healthState: after.healthState,
				version: after.version,
				reason: after.healthReason,
				note: after.healthNote,
			};

			await this.audit.writeInTx(tx, {
				tenantId,
				actorId: userId,
				actorType: AuditActorType.USER,
				actorRoleCode: null,
				action: AuditAction.LIVESTOCK_STATE_CHANGE,
				resource: 'product_batch',
				resourceId: batch.id,
				before: beforeSnap,
				after: afterSnap,
			});

			return this.toView(after);
		});
	}

	private toView(batch: {
		id: string;
		tenantId: string;
		productId: string;
		warehouseId: string;
		batchCode: string;
		healthState: LivestockHealthState;
		version: number;
		healthReason: string | null;
		healthNote: string | null;
		healthChangedAt: Date | null;
		healthChangedBy: string | null;
	}): LivestockBatchStateView {
		return {
			id: batch.id,
			tenantId: batch.tenantId,
			productId: batch.productId,
			warehouseId: batch.warehouseId,
			batchCode: batch.batchCode,
			healthState: batch.healthState,
			version: batch.version,
			healthReason: batch.healthReason,
			healthNote: batch.healthNote,
			healthChangedAt: batch.healthChangedAt,
			healthChangedBy: batch.healthChangedBy,
		};
	}

	private async withSerializableRetry<T>(
		operation: (tx: Tx) => Promise<T>,
	): Promise<T> {
		for (let attempt = 0; attempt < 3; attempt += 1) {
			try {
				return await this.prisma.$transaction(operation, {
					isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
				});
			} catch (error) {
				if (
					error instanceof UnprocessableEntityException ||
					error instanceof NotFoundException ||
					error instanceof ConflictException
				) {
					throw error;
				}
				const retryable =
					error instanceof Prisma.PrismaClientKnownRequestError &&
					error.code === 'P2034';
				if (!retryable) throw error;
				if (attempt === 2) {
					throw new ConflictException({ reason: 'SERIALIZATION_CONFLICT' });
				}
			}
		}
		throw new ConflictException({ reason: 'SERIALIZATION_CONFLICT' });
	}
}
