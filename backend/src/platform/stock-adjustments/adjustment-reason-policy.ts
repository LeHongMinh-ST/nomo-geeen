import { UnprocessableEntityException } from '@nestjs/common';
import { ProductKind } from '@prisma/client';

/**
 * Closed adjustment reason vocabulary per ProductKind (core-business-catalog §5–9).
 * Aquaculture kinds use FALLBACK set in Phase 1 (scope: no aqua-only pack).
 */

const PESTICIDE_VET: readonly string[] = [
	'MOISTURE_DAMAGE',
	'EXPIRED_SCRAP',
	'RECALL_SCRAP',
	'COUNT_CORRECTION',
];

const FERTILIZER: readonly string[] = [
	'MOISTURE_CAKING',
	'BAG_TEAR',
	'QUALITY_LOSS',
	'COUNT_CORRECTION',
];

const SEED_LIKE: readonly string[] = [
	'MOLD_MOISTURE',
	'DEAD_PLANT',
	'CULL',
	'CARE_SHRINK',
	'COUNT_CORRECTION',
];

const ANIMAL_FEED: readonly string[] = [
	'MOISTURE',
	'MOLD',
	'CAKING',
	'OPEN_BAG',
	'SHRINK',
	'COUNT_CORRECTION',
];

const LIVESTOCK_SEED: readonly string[] = [
	'DEAD',
	'SICK_CULL',
	'QUARANTINE_HOLD',
	'SOURCE_RETURN',
	'COUNT_CORRECTION',
];

/** OTHER + unknown / aquaculture Phase-1 fallback */
export const FALLBACK_REASONS: readonly string[] = [
	'COUNT_CORRECTION',
	'OTHER_LOSS',
];

const KIND_REASONS: ReadonlyMap<ProductKind, readonly string[]> = new Map([
	[ProductKind.PESTICIDE, PESTICIDE_VET],
	[ProductKind.VET_DRUG, PESTICIDE_VET],
	[ProductKind.FERTILIZER, FERTILIZER],
	[ProductKind.SEED, SEED_LIKE],
	[ProductKind.SEEDLING, SEED_LIKE],
	[ProductKind.CROP_SEED, SEED_LIKE],
	[ProductKind.ANIMAL_FEED, ANIMAL_FEED],
	[ProductKind.LIVESTOCK_SEED, LIVESTOCK_SEED],
	[ProductKind.OTHER, FALLBACK_REASONS],
	// Optional / aqua / agri: Phase 1 fallback (not aqua-specific pack)
	[ProductKind.AGRI_MATERIAL, FALLBACK_REASONS],
	[ProductKind.AQUA_DRUG, FALLBACK_REASONS],
	[ProductKind.AQUA_FEED, FALLBACK_REASONS],
	[ProductKind.AQUA_SEED, FALLBACK_REASONS],
]);

export function reasonsForKind(
	productKind?: ProductKind | null,
): readonly string[] {
	if (!productKind) return FALLBACK_REASONS;
	return KIND_REASONS.get(productKind) ?? FALLBACK_REASONS;
}

export function isReasonAllowed(
	productKind: ProductKind | null | undefined,
	reasonCode: string | null | undefined,
): boolean {
	const code = reasonCode?.trim() ?? '';
	if (!code) return false;
	return reasonsForKind(productKind).includes(code);
}

/**
 * Throws 422 INVALID_REASON when kind/reason pair is outside closed map.
 * Returns trimmed code for persist (caller must use return value, not raw input).
 */
export function assertReasonAllowed(
	productKind: ProductKind | null | undefined,
	reasonCode: string | null | undefined,
): string {
	const code = reasonCode?.trim() ?? '';
	if (!isReasonAllowed(productKind, code)) {
		throw new UnprocessableEntityException({
			reason: 'INVALID_REASON',
			message: 'Reason code is not allowed for this product kind',
			field: 'reasonCode',
		});
	}
	return code;
}
