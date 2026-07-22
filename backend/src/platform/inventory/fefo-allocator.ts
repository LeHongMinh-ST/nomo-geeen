import { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

export type FefoAllocation = {
	batchId: string;
	qtyBase: Prisma.Decimal;
};

export async function allocateFefo(
	tx: Tx,
	params: {
		tenantId: string;
		warehouseId: string;
		productId: string;
		qtyBase: Prisma.Decimal;
	},
): Promise<FefoAllocation[]> {
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const batches = await tx.productBatch.findMany({
		where: {
			tenantId: params.tenantId,
			warehouseId: params.warehouseId,
			productId: params.productId,
			isRecalled: false,
			qtyOnHand: { gt: 0 },
			OR: [{ expiresAt: null }, { expiresAt: { gte: today } }],
		},
		select: { id: true, expiresAt: true, createdAt: true, qtyOnHand: true },
	});
	batches.sort((left, right) => {
		const expiry =
			(left.expiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER) -
			(right.expiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER);
		if (expiry !== 0) return expiry;
		const created = left.createdAt.getTime() - right.createdAt.getTime();
		return created !== 0 ? created : left.id.localeCompare(right.id);
	});
	if (batches.length === 0) return [];

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
				{
					code: 'P2034',
					clientVersion: '7.8.0',
				},
			);
		}
		allocations.push({ batchId: batch.id, qtyBase: qty });
		remaining = remaining.sub(qty);
	}
	if (remaining.gt(0)) {
		throw new Error('INSUFFICIENT_FEFO_STOCK');
	}
	return allocations;
}
