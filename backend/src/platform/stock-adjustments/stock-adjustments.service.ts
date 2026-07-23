import { randomUUID } from 'node:crypto';
import {
	ConflictException,
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, StockDirection, StockReason } from '@prisma/client';
import { isBatchControlled } from '../inventory/batch-policy';
import { PrismaService } from '../prisma/prisma.service';
import { assertReasonAllowed } from './adjustment-reason-policy';

type Tx = Prisma.TransactionClient;

export type AdjustmentLineInput = {
	productId: string;
	delta: string | number;
	reasonCode: string;
	batchId?: string | null;
};

export type CreateAdjustmentInput = {
	warehouseId: string;
	note?: string | null;
	lines: AdjustmentLineInput[];
};

const STATUS_DRAFT = 'DRAFT';
const STATUS_COMPLETED = 'COMPLETED';

@Injectable()
export class StockAdjustmentsService {
	constructor(private readonly prisma: PrismaService) {}

	async list(
		tenantId: string,
		query: { page?: number; pageSize?: number; status?: string },
	) {
		const page = query.page ?? 1;
		const pageSize = query.pageSize ?? 20;
		const where: Prisma.StockAdjustmentWhereInput = {
			tenantId,
			...(query.status ? { status: query.status } : {}),
		};
		const [items, total] = await Promise.all([
			this.prisma.stockAdjustment.findMany({
				where,
				orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
				skip: (page - 1) * pageSize,
				take: pageSize,
				include: { lines: true },
			}),
			this.prisma.stockAdjustment.count({ where }),
		]);
		return {
			items: items.map((item) => this.toResponse(item)),
			page,
			pageSize,
			total,
		};
	}

	async findById(tenantId: string, id: string) {
		const adjustment = await this.prisma.stockAdjustment.findFirst({
			where: { id, tenantId },
			include: { lines: true },
		});
		if (!adjustment) throw new NotFoundException('Stock adjustment not found');
		return this.toResponse(adjustment);
	}

	/**
	 * Create DRAFT adjustment with lines (reason validated; stock not moved yet).
	 * Schema default status is COMPLETED — always set DRAFT explicitly.
	 */
	async createDraft(
		tenantId: string,
		userId: string,
		input: CreateAdjustmentInput,
	) {
		return this.withSerializableRetry(async (tx) => {
			this.assertHasLines(input.lines);
			const warehouse = await tx.warehouse.findFirst({
				where: { id: input.warehouseId, tenantId, deletedAt: null },
				select: { id: true },
			});
			if (!warehouse) {
				throw new UnprocessableEntityException({
					reason: 'INVALID_WAREHOUSE',
					message: 'Warehouse not found for tenant',
				});
			}
			const prepared = await this.prepareLines(tx, tenantId, input.lines);
			const adjustment = await tx.stockAdjustment.create({
				data: {
					tenantId,
					docNo: `ADJ-${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`,
					warehouseId: warehouse.id,
					status: STATUS_DRAFT,
					note: input.note?.trim() || null,
					createdBy: userId,
					lines: {
						create: prepared.map((line) => ({
							productId: line.productId,
							batchId: line.batchId,
							// Placeholders until complete snapshots stock
							qtyBefore: new Prisma.Decimal(0),
							qtyAfter: new Prisma.Decimal(0),
							delta: line.delta,
							reasonCode: line.reasonCode,
						})),
					},
				},
				include: { lines: true },
			});
			return this.toResponse(adjustment);
		});
	}

	async complete(tenantId: string, userId: string, id: string) {
		return this.withSerializableRetry(async (tx) => {
			const adjustment = await tx.stockAdjustment.findFirst({
				where: { id, tenantId },
				include: {
					lines: true,
				},
			});
			if (!adjustment)
				throw new NotFoundException('Stock adjustment not found');
			if (adjustment.status === STATUS_COMPLETED) {
				throw new UnprocessableEntityException({
					reason: 'INVALID_STATE',
					message: 'Completed adjustment is immutable',
				});
			}
			if (adjustment.status !== STATUS_DRAFT) {
				throw new UnprocessableEntityException({
					reason: 'INVALID_STATE',
					message: 'Only DRAFT adjustments can be completed',
				});
			}
			if (!adjustment.lines.length) {
				throw new UnprocessableEntityException({
					reason: 'INVALID_STATE',
					message: 'Adjustment has no lines',
				});
			}

			const productIds = [...new Set(adjustment.lines.map((l) => l.productId))];
			const products = await tx.product.findMany({
				where: {
					tenantId,
					id: { in: productIds },
					deletedAt: null,
				},
				select: { id: true, productKind: true },
			});
			const productById = new Map(products.map((p) => [p.id, p]));

			for (const line of adjustment.lines) {
				const product = productById.get(line.productId);
				if (!product) {
					throw new UnprocessableEntityException({
						reason: 'INVALID_PRODUCT',
						message: 'Product missing for adjustment line',
						field: 'productId',
					});
				}
				const reasonCode = assertReasonAllowed(
					product.productKind,
					line.reasonCode,
				);
				const delta = new Prisma.Decimal(line.delta.toString());
				if (delta.eq(0) || !delta.isFinite()) {
					throw new UnprocessableEntityException({
						reason: 'INVALID_STATE',
						message: 'Line delta must not be zero',
						field: 'delta',
					});
				}

				const stock = await tx.stock.findFirst({
					where: {
						tenantId,
						warehouseId: adjustment.warehouseId,
						productId: line.productId,
					},
				});
				const qtyBefore = stock?.qty ?? new Prisma.Decimal(0);
				const qtyAfter = qtyBefore.add(delta);
				if (qtyAfter.lt(0)) {
					throw new UnprocessableEntityException({
						reason: 'INSUFFICIENT_STOCK',
						message: 'Adjustment would make stock negative',
						field: 'delta',
					});
				}

				const absDelta = delta.abs();
				const isDecrease = delta.lt(0);
				const batchControlled = isBatchControlled(product.productKind);
				const batchId = line.batchId ?? null;

				if (isDecrease && batchControlled) {
					if (!batchId) {
						throw new UnprocessableEntityException({
							reason: 'BATCH_REQUIRED',
							message: 'batchId required for batch-controlled decrease',
							field: 'batchId',
						});
					}
					const batch = await tx.productBatch.findFirst({
						where: {
							id: batchId,
							tenantId,
							productId: line.productId,
							warehouseId: adjustment.warehouseId,
						},
						select: { id: true, qtyOnHand: true },
					});
					if (!batch) {
						throw new UnprocessableEntityException({
							reason: 'BATCH_REQUIRED',
							message: 'Batch not found for product/warehouse',
							field: 'batchId',
						});
					}
					const batchUpdated = await tx.productBatch.updateMany({
						where: {
							id: batch.id,
							tenantId,
							qtyOnHand: { gte: absDelta },
						},
						data: { qtyOnHand: { decrement: absDelta } },
					});
					if (batchUpdated.count !== 1) {
						throw new UnprocessableEntityException({
							reason: 'INSUFFICIENT_BATCH',
							message: 'Insufficient batch qtyOnHand',
							field: 'batchId',
						});
					}
				} else if (!isDecrease && batchId) {
					// Optional increase onto existing batch
					const batch = await tx.productBatch.findFirst({
						where: {
							id: batchId,
							tenantId,
							productId: line.productId,
							warehouseId: adjustment.warehouseId,
						},
						select: { id: true },
					});
					if (!batch) {
						throw new UnprocessableEntityException({
							reason: 'BATCH_REQUIRED',
							message: 'Batch not found for product/warehouse',
							field: 'batchId',
						});
					}
					await tx.productBatch.update({
						where: { id: batch.id },
						data: { qtyOnHand: { increment: absDelta } },
					});
				}

				if (stock) {
					if (isDecrease) {
						const updated = await tx.stock.updateMany({
							where: {
								id: stock.id,
								tenantId,
								qty: { gte: absDelta },
							},
							data: { qty: { decrement: absDelta } },
						});
						if (updated.count !== 1) {
							throw new UnprocessableEntityException({
								reason: 'INSUFFICIENT_STOCK',
								message: 'Adjustment would make stock negative',
								field: 'delta',
							});
						}
					} else {
						await tx.stock.update({
							where: { id: stock.id },
							data: { qty: { increment: absDelta } },
						});
					}
				} else if (!isDecrease) {
					await tx.stock.create({
						data: {
							tenantId,
							warehouseId: adjustment.warehouseId,
							productId: line.productId,
							qty: absDelta,
						},
					});
				} else {
					throw new UnprocessableEntityException({
						reason: 'INSUFFICIENT_STOCK',
						message: 'No stock row for decrease',
						field: 'delta',
					});
				}

				await tx.stockMovement.create({
					data: {
						tenantId,
						warehouseId: adjustment.warehouseId,
						productId: line.productId,
						batchId: batchId ?? undefined,
						direction: isDecrease ? StockDirection.OUT : StockDirection.IN,
						qty: absDelta,
						reason: StockReason.ADJUSTMENT,
						refType: 'StockAdjustment',
						refId: adjustment.id,
						refLineId: line.id,
						createdBy: userId,
					},
				});

				await tx.stockAdjustmentLine.update({
					where: { id: line.id },
					data: {
						qtyBefore,
						qtyAfter,
						reasonCode,
						batchId,
					},
				});
			}

			const terminal = await tx.stockAdjustment.updateMany({
				where: {
					id: adjustment.id,
					tenantId,
					status: STATUS_DRAFT,
				},
				data: { status: STATUS_COMPLETED },
			});
			if (terminal.count !== 1) {
				throw new ConflictException({
					reason: 'CONCURRENT_MODIFICATION',
					message: 'Adjustment status changed concurrently',
				});
			}

			const completed = await tx.stockAdjustment.findFirstOrThrow({
				where: { id: adjustment.id, tenantId },
				include: { lines: true },
			});
			return this.toResponse(completed);
		});
	}

	private async prepareLines(
		tx: Tx,
		tenantId: string,
		lines: AdjustmentLineInput[],
	) {
		const productIds = [...new Set(lines.map((l) => l.productId))];
		const products = await tx.product.findMany({
			where: { tenantId, id: { in: productIds }, deletedAt: null },
			select: { id: true, productKind: true },
		});
		const productById = new Map(products.map((p) => [p.id, p]));
		return lines.map((line) => {
			const product = productById.get(line.productId);
			if (!product) {
				throw new UnprocessableEntityException({
					reason: 'INVALID_PRODUCT',
					message: 'Product missing for adjustment line',
					field: 'productId',
				});
			}
			const reasonCode = assertReasonAllowed(
				product.productKind,
				line.reasonCode,
			);
			const delta = new Prisma.Decimal(String(line.delta));
			if (delta.eq(0) || !delta.isFinite()) {
				throw new UnprocessableEntityException({
					reason: 'INVALID_STATE',
					message: 'Line delta must be non-zero',
					field: 'delta',
				});
			}
			const batchId = line.batchId?.trim() || null;
			if (delta.lt(0) && isBatchControlled(product.productKind) && !batchId) {
				throw new UnprocessableEntityException({
					reason: 'BATCH_REQUIRED',
					message: 'batchId required for batch-controlled decrease',
					field: 'batchId',
				});
			}
			return {
				productId: line.productId,
				delta,
				reasonCode,
				batchId,
			};
		});
	}

	private assertHasLines(lines: AdjustmentLineInput[] | undefined) {
		if (!lines?.length) {
			throw new UnprocessableEntityException({
				reason: 'INVALID_STATE',
				message: 'At least one line is required',
			});
		}
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

	private toResponse(adjustment: {
		id: string;
		tenantId: string;
		docNo: string;
		warehouseId: string;
		status: string;
		note: string | null;
		createdBy: string | null;
		createdAt: Date;
		lines: Array<{
			id: string;
			productId: string;
			batchId: string | null;
			qtyBefore: Prisma.Decimal;
			qtyAfter: Prisma.Decimal;
			delta: Prisma.Decimal;
			reasonCode: string;
		}>;
	}) {
		return {
			id: adjustment.id,
			docNo: adjustment.docNo,
			warehouseId: adjustment.warehouseId,
			status: adjustment.status,
			note: adjustment.note,
			createdBy: adjustment.createdBy,
			createdAt: adjustment.createdAt,
			lines: adjustment.lines.map((line) => ({
				id: line.id,
				productId: line.productId,
				batchId: line.batchId,
				qtyBefore: line.qtyBefore.toString(),
				qtyAfter: line.qtyAfter.toString(),
				delta: line.delta.toString(),
				reasonCode: line.reasonCode,
			})),
		};
	}
}
