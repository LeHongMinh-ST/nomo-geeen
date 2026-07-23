import { ProductKind } from '@prisma/client';
import {
	assertReasonAllowed,
	FALLBACK_REASONS,
	isReasonAllowed,
	reasonsForKind,
} from './adjustment-reason-policy';

describe('adjustment-reason-policy', () => {
	it('allows pesticide moisture and recall codes', () => {
		expect(isReasonAllowed(ProductKind.PESTICIDE, 'MOISTURE_DAMAGE')).toBe(
			true,
		);
		expect(isReasonAllowed(ProductKind.PESTICIDE, 'RECALL_SCRAP')).toBe(true);
		expect(isReasonAllowed(ProductKind.VET_DRUG, 'EXPIRED_SCRAP')).toBe(true);
	});

	it('rejects fertilizer reason on pesticide', () => {
		expect(isReasonAllowed(ProductKind.PESTICIDE, 'MOISTURE_CAKING')).toBe(
			false,
		);
		expect(isReasonAllowed(ProductKind.PESTICIDE, 'BAG_TEAR')).toBe(false);
	});

	it('allows fertilizer catalog codes only', () => {
		expect(isReasonAllowed(ProductKind.FERTILIZER, 'MOISTURE_CAKING')).toBe(
			true,
		);
		expect(isReasonAllowed(ProductKind.FERTILIZER, 'OPEN_BAG')).toBe(false);
	});

	it('allows seed-like kinds shared set', () => {
		for (const kind of [
			ProductKind.SEED,
			ProductKind.SEEDLING,
			ProductKind.CROP_SEED,
		]) {
			expect(isReasonAllowed(kind, 'DEAD_PLANT')).toBe(true);
			expect(isReasonAllowed(kind, 'MOLD_MOISTURE')).toBe(true);
			expect(isReasonAllowed(kind, 'DEAD')).toBe(false);
		}
	});

	it('allows animal feed open bag and mold', () => {
		expect(isReasonAllowed(ProductKind.ANIMAL_FEED, 'OPEN_BAG')).toBe(true);
		expect(isReasonAllowed(ProductKind.ANIMAL_FEED, 'MOLD')).toBe(true);
		expect(isReasonAllowed(ProductKind.ANIMAL_FEED, 'RECALL_SCRAP')).toBe(
			false,
		);
	});

	it('allows livestock seed death/quarantine', () => {
		expect(isReasonAllowed(ProductKind.LIVESTOCK_SEED, 'DEAD')).toBe(true);
		expect(isReasonAllowed(ProductKind.LIVESTOCK_SEED, 'QUARANTINE_HOLD')).toBe(
			true,
		);
		expect(isReasonAllowed(ProductKind.LIVESTOCK_SEED, 'DEAD_PLANT')).toBe(
			false,
		);
	});

	it('OTHER and null kind use fallback only', () => {
		expect(reasonsForKind(ProductKind.OTHER)).toEqual([...FALLBACK_REASONS]);
		expect(reasonsForKind(null)).toEqual([...FALLBACK_REASONS]);
		expect(isReasonAllowed(ProductKind.OTHER, 'COUNT_CORRECTION')).toBe(true);
		expect(isReasonAllowed(ProductKind.OTHER, 'OTHER_LOSS')).toBe(true);
		expect(isReasonAllowed(ProductKind.OTHER, 'MOISTURE_DAMAGE')).toBe(false);
		expect(isReasonAllowed(null, 'OTHER_LOSS')).toBe(true);
	});

	it('aquaculture kinds use fallback Phase 1 (no aqua pack)', () => {
		expect(isReasonAllowed(ProductKind.AQUA_FEED, 'COUNT_CORRECTION')).toBe(
			true,
		);
		expect(isReasonAllowed(ProductKind.AQUA_SEED, 'OTHER_LOSS')).toBe(true);
		expect(isReasonAllowed(ProductKind.AQUA_DRUG, 'RECALL_SCRAP')).toBe(false);
	});

	it('rejects empty or free-text reason', () => {
		expect(isReasonAllowed(ProductKind.PESTICIDE, '')).toBe(false);
		expect(isReasonAllowed(ProductKind.PESTICIDE, '   ')).toBe(false);
		expect(isReasonAllowed(ProductKind.PESTICIDE, 'custom free text')).toBe(
			false,
		);
	});

	it('assertReasonAllowed throws INVALID_REASON', () => {
		expect(() =>
			assertReasonAllowed(ProductKind.FERTILIZER, 'RECALL_SCRAP'),
		).toThrow(
			expect.objectContaining({
				response: expect.objectContaining({
					reason: 'INVALID_REASON',
					field: 'reasonCode',
				}),
			}),
		);
	});

	it('assertReasonAllowed accepts valid pair and returns trimmed code', () => {
		expect(
			assertReasonAllowed(ProductKind.PESTICIDE, '  COUNT_CORRECTION  '),
		).toBe('COUNT_CORRECTION');
	});
});
