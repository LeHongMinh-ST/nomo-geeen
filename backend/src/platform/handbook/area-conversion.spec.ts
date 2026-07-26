import { toSquareMeters } from './area-conversion';

describe('toSquareMeters', () => {
	it.each([
		['M2', 1, 1],
		['HA', 2, 20_000],
		['SAO_BAC', 1, 360],
		['SAO_TRUNG', 1, 500],
		['CONG_NAM', 3, 3_000],
	] as const)('converts %s', (unit, value, expected) => {
		const result = toSquareMeters(value, unit);
		expect(result).toEqual({ ok: true, squareMeters: expected });
	});

	it('supports fractional areas', () => {
		expect(toSquareMeters(0.5, 'HA')).toEqual({
			ok: true,
			squareMeters: 5_000,
		});
	});

	it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
		'rejects non-positive or non-finite value %p',
		(value) => {
			expect(toSquareMeters(value, 'M2')).toEqual({
				ok: false,
				reason: 'INVALID_VALUE',
			});
		},
	);

	it('rejects an unknown unit', () => {
		expect(
			toSquareMeters(1, 'MAU' as unknown as Parameters<typeof toSquareMeters>[1]),
		).toEqual({ ok: false, reason: 'INVALID_UNIT' });
	});
});
