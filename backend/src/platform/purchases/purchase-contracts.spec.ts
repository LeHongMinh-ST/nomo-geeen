import { Prisma } from '@prisma/client';
import {
	calculateDebtAmount,
	calculatePurchaseTotal,
	deriveBaseQuantity,
} from './purchase-contracts';

describe('purchase contracts', () => {
	it('derives base quantity with decimal conversion', () => {
		expect(deriveBaseQuantity('2.5', '40')).toEqual(new Prisma.Decimal('100'));
	});
	it('rejects non-positive quantity or factor', () => {
		expect(() => deriveBaseQuantity('0', '40')).toThrow();
		expect(() => deriveBaseQuantity('2', '0')).toThrow();
	});
	it('calculates totals and debt from integer VND', () => {
		expect(calculatePurchaseTotal(100000n, 10000n, 5000n)).toBe(95000n);
		expect(calculateDebtAmount(95000n, 20000n)).toBe(75000n);
		expect(calculateDebtAmount(95000n, 100000n)).toBe(0n);
	});
	it('rejects negative values and excessive discount', () => {
		expect(() => calculatePurchaseTotal(10n, 11n, 0n)).toThrow();
		expect(() => calculatePurchaseTotal(-1n, 0n, 0n)).toThrow();
	});
});
