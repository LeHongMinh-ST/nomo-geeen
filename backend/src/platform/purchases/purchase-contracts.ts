import { Prisma } from '@prisma/client';

export function deriveBaseQuantity(
	qty: string | number,
	factor: string | number,
): Prisma.Decimal {
	const quantity = new Prisma.Decimal(qty);
	const conversion = new Prisma.Decimal(factor);
	if (!quantity.gt(0) || !conversion.gt(0))
		throw new Error('Quantity and conversion factor must be positive');
	return quantity.mul(conversion);
}
export function calculatePurchaseTotal(
	subtotal: bigint,
	discountAmount: bigint,
	shippingFee: bigint,
): bigint {
	if (subtotal < 0n || discountAmount < 0n || shippingFee < 0n)
		throw new Error('Monetary values cannot be negative');
	if (discountAmount > subtotal)
		throw new Error('Discount cannot exceed subtotal');
	return subtotal - discountAmount + shippingFee;
}
export function calculateDebtAmount(total: bigint, amountPaid: bigint): bigint {
	if (total < 0n || amountPaid < 0n)
		throw new Error('Monetary values cannot be negative');
	return total > amountPaid ? total - amountPaid : 0n;
}
