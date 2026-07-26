import {
	classifyExpiry,
	daysToExpiry,
	EXPIRY_TIER_DAYS,
	EXPIRY_TIERS,
	type ExpiryTier,
	emptyTierCounts,
	worstExpiryTier,
} from './expiry-policy';

describe('expiry-policy', () => {
	/** Mid-day on purpose: classification must ignore the time component. */
	const now = new Date('2026-07-26T13:45:12.345Z');

	function expiryInDays(days: number): Date {
		const date = new Date('2026-07-26T00:00:00.000Z');
		date.setUTCDate(date.getUTCDate() + days);
		return date;
	}

	describe('daysToExpiry', () => {
		it('returns null when the batch has no expiry date', () => {
			expect(daysToExpiry(null, now)).toBeNull();
			expect(daysToExpiry(undefined, now)).toBeNull();
		});

		it('counts whole UTC days and ignores the time of day on both sides', () => {
			expect(daysToExpiry(new Date('2026-07-26T00:00:00.000Z'), now)).toBe(0);
			expect(daysToExpiry(new Date('2026-07-26T23:59:59.999Z'), now)).toBe(0);
			expect(daysToExpiry(new Date('2026-07-27T00:00:00.000Z'), now)).toBe(1);
			expect(daysToExpiry(new Date('2026-07-25T23:59:59.999Z'), now)).toBe(-1);
		});

		it('spans month and year boundaries', () => {
			expect(daysToExpiry(new Date('2027-07-26T00:00:00.000Z'), now)).toBe(365);
		});
	});

	describe('classifyExpiry tier boundaries', () => {
		const cases: Array<[number, ExpiryTier]> = [
			[-1, 'EXPIRED'],
			[0, 'CRITICAL'],
			[30, 'CRITICAL'],
			[31, 'WARNING'],
			[90, 'WARNING'],
			[91, 'NOTICE'],
			[180, 'NOTICE'],
			[181, 'FRESH'],
		];

		it.each(cases)('%i days remaining classifies as %s', (days, expected) => {
			expect(classifyExpiry(expiryInDays(days), now)).toBe(expected);
		});

		it('treats zero days left as CRITICAL rather than EXPIRED', () => {
			expect(classifyExpiry(expiryInDays(0), now)).toBe('CRITICAL');
		});

		it('classifies a missing expiry date as NONE', () => {
			expect(classifyExpiry(null, now)).toBe('NONE');
			expect(classifyExpiry(undefined, now)).toBe('NONE');
		});

		it('classifies long-past dates as EXPIRED', () => {
			expect(classifyExpiry(expiryInDays(-400), now)).toBe('EXPIRED');
		});

		it('uses the 30/90/180 day marks from catalog §5.1', () => {
			expect(EXPIRY_TIER_DAYS).toEqual({
				CRITICAL: 30,
				WARNING: 90,
				NOTICE: 180,
			});
		});

		it('never returns a tier outside the closed set', () => {
			for (let days = -5; days <= 200; days += 1) {
				expect(EXPIRY_TIERS).toContain(classifyExpiry(expiryInDays(days), now));
			}
		});
	});

	describe('worstExpiryTier', () => {
		it('returns NONE for an empty batch list', () => {
			expect(worstExpiryTier([])).toBe('NONE');
		});

		it('picks the most severe tier present', () => {
			expect(worstExpiryTier(['FRESH', 'EXPIRED', 'NOTICE'])).toBe('EXPIRED');
			expect(worstExpiryTier(['FRESH', 'WARNING', 'CRITICAL'])).toBe(
				'CRITICAL',
			);
			expect(worstExpiryTier(['NOTICE', 'WARNING'])).toBe('WARNING');
		});

		it('ranks any dated batch above an undated one', () => {
			expect(worstExpiryTier(['NONE', 'FRESH'])).toBe('FRESH');
			expect(worstExpiryTier(['NONE', 'NONE'])).toBe('NONE');
		});
	});

	describe('emptyTierCounts', () => {
		it('seeds every tier at zero', () => {
			const counts = emptyTierCounts();
			expect(Object.keys(counts).sort()).toEqual([...EXPIRY_TIERS].sort());
			expect(Object.values(counts).every((n) => n === 0)).toBe(true);
		});

		it('returns a fresh object each call', () => {
			const a = emptyTierCounts();
			a.EXPIRED += 1;
			expect(emptyTierCounts().EXPIRED).toBe(0);
		});
	});
});
