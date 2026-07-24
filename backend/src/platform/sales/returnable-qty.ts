import { Prisma } from '@prisma/client';

export type QtyKey = string;

export function qtyKey(lineId: string, batchId?: string | null): QtyKey {
	return `${lineId}::${batchId ?? ''}`;
}

export function decimalToNumber(
	value: Prisma.Decimal | string | number,
): number {
	return Number(new Prisma.Decimal(value).toString());
}

export function addQty(
	map: Map<QtyKey, number>,
	lineId: string,
	batchId: string | null | undefined,
	qty: Prisma.Decimal | string | number,
) {
	const key = qtyKey(lineId, batchId);
	const next = (map.get(key) ?? 0) + decimalToNumber(qty);
	map.set(key, next);
}

export function remainingQty(original: number, returned: number): number {
	return Math.max(0, original - returned);
}

/** Pro-rata debt share: floor(debt * returnedTotal / saleTotal). */
export function proRataDebt(
	debtAmount: bigint,
	returnedTotal: bigint,
	documentTotal: bigint,
): bigint {
	if (debtAmount <= 0n || documentTotal <= 0n || returnedTotal <= 0n) return 0n;
	return (debtAmount * returnedTotal) / documentTotal;
}

export function resolveSettlementMode(
	requested: string | undefined,
	debtAmount: bigint,
): 'DEBT_ADJUST_ONLY' | 'NONE' | 'REFUND_VOUCHER' {
	if (
		requested === 'DEBT_ADJUST_ONLY' ||
		requested === 'NONE' ||
		requested === 'REFUND_VOUCHER'
	) {
		return requested;
	}
	return debtAmount > 0n ? 'DEBT_ADJUST_ONLY' : 'NONE';
}
