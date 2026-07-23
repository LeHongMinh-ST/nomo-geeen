import { UnprocessableEntityException } from '@nestjs/common';
import { Prisma, ProductKind } from '@prisma/client';
import { isBatchCodeRequired, isBatchControlled } from './batch-policy';

type Tx = Prisma.TransactionClient;

export type FefoAllocation = {
	batchId: string;
	qtyBase: Prisma.Decimal;
};

const prismaClientVersion =
	(Prisma as unknown as { prismaVersion?: { client?: string } }).prismaVersion
		?.client ?? '0.0.0';

/**
 * FEFO allocate + conditional batch decrement inside caller's transaction.
 * Throws INSUFFICIENT_ELIGIBLE_BATCH when remaining qty cannot be covered.
 */
export async function allocateFefo(
	tx: Tx,
	params: {
		tenantId: string;
		warehouseId: string;
		productId: string;
		qtyBase: Prisma.Decimal;
	},
): Promise<FefoAllocation[]> {
	if (!params.qtyBase.gt(0)) {
		throw new UnprocessableEntityException({
			reason: 'INVALID_QTY',
			message: 'qtyBase must be positive',
		});
	}

	const today = new Date();
	today.setUTCHours(0, 0, 0, 0);

	const batches = await tx.productBatch.findMany({
		where: {
			tenantId: params.tenantId,
			warehouseId: params.warehouseId,
			productId: params.productId,
			isRecalled: false,
			qtyOnHand: { gt: 0 },
			OR: [{ expiresAt: null }, { expiresAt: { gte: today } }],
		},
		select: {
			id: true,
			expiresAt: true,
			createdAt: true,
			qtyOnHand: true,
		},
	});

	batches.sort((left, right) => {
		const expiry =
			(left.expiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER) -
			(right.expiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER);
		if (expiry !== 0) return expiry;
		const created = left.createdAt.getTime() - right.createdAt.getTime();
		return created !== 0 ? created : left.id.localeCompare(right.id);
	});

	let remaining = params.qtyBase;
	const allocations: FefoAllocation[] = [];

	for (const batch of batches) {
		if (!remaining.gt(0)) break;
		const qty = Prisma.Decimal.min(batch.qtyOnHand, remaining);
		const updated = await tx.productBatch.updateMany({
			where: {
				id: batch.id,
				tenantId: params.tenantId,
				warehouseId: params.warehouseId,
				productId: params.productId,
				isRecalled: false,
				qtyOnHand: { gte: qty },
			},
			data: { qtyOnHand: { decrement: qty } },
		});
		if (updated.count !== 1) {
			throw new Prisma.PrismaClientKnownRequestError(
				'Batch changed concurrently',
				{ code: 'P2034', clientVersion: prismaClientVersion },
			);
		}
		allocations.push({ batchId: batch.id, qtyBase: qty });
		remaining = remaining.sub(qty);
	}

	if (remaining.gt(0)) {
		throw new UnprocessableEntityException({
			reason: 'INSUFFICIENT_ELIGIBLE_BATCH',
			message: 'Insufficient eligible batch quantity for FEFO allocation',
		});
	}

	return allocations;
}

/**
 * Sale stock path:
 * - required-batch kinds → always FEFO
 * - optional-batch kinds with any qtyOnHand on batches → FEFO (prevents stock/batch drift)
 * - optional without batch rows / OTHER → empty allocations (aggregate Stock only)
 */
export async function resolveSaleAllocations(
	tx: Tx,
	params: {
		tenantId: string;
		warehouseId: string;
		productId: string;
		qtyBase: Prisma.Decimal;
		productKind?: ProductKind | null;
	},
): Promise<FefoAllocation[]> {
	const { productKind, ...allocParams } = params;

	if (isBatchCodeRequired(productKind)) {
		return allocateFefo(tx, allocParams);
	}

	if (!isBatchControlled(productKind)) {
		return [];
	}

	const batchStock = await tx.productBatch.aggregate({
		where: {
			tenantId: params.tenantId,
			warehouseId: params.warehouseId,
			productId: params.productId,
			qtyOnHand: { gt: 0 },
		},
		_sum: { qtyOnHand: true },
	});
	const onHand = batchStock._sum.qtyOnHand;
	if (onHand && new Prisma.Decimal(onHand).gt(0)) {
		return allocateFefo(tx, allocParams);
	}
	return [];
}
