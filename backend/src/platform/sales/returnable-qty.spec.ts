import {
	proRataDebt,
	remainingQty,
	resolveSettlementMode,
} from './returnable-qty';

describe('returnable-qty', () => {
	it('computes remaining qty', () => {
		expect(remainingQty(10, 3)).toBe(7);
		expect(remainingQty(2, 5)).toBe(0);
	});

	it('pro-rates debt with floor division', () => {
		expect(proRataDebt(1000n, 250n, 1000n)).toBe(250n);
		expect(proRataDebt(1000n, 1n, 3n)).toBe(333n);
		expect(proRataDebt(0n, 100n, 100n)).toBe(0n);
	});

	it('defaults settlement mode from debt', () => {
		expect(resolveSettlementMode(undefined, 10n)).toBe('DEBT_ADJUST_ONLY');
		expect(resolveSettlementMode(undefined, 0n)).toBe('NONE');
		expect(resolveSettlementMode('REFUND_VOUCHER', 0n)).toBe('REFUND_VOUCHER');
	});
});
