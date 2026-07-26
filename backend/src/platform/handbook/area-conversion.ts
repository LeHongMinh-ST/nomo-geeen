import { AreaUnit } from '@prisma/client';

/**
 * Square meters per area unit. Regional "sào" values differ by region, which is exactly
 * why the enum spells each one out instead of carrying a single ambiguous "SAO".
 */
const SQUARE_METERS_PER_UNIT: Record<AreaUnit, number> = {
	M2: 1,
	HA: 10_000,
	SAO_BAC: 360,
	SAO_TRUNG: 500,
	CONG_NAM: 1_000,
};

export const AREA_UNIT_LABELS: Record<AreaUnit, string> = {
	M2: 'm²',
	HA: 'ha',
	SAO_BAC: 'sào Bắc Bộ (360m²)',
	SAO_TRUNG: 'sào Trung Bộ (500m²)',
	CONG_NAM: 'công Nam Bộ (1.000m²)',
};

export type AreaConversionResult =
	| { ok: true; squareMeters: number }
	| { ok: false; reason: 'INVALID_UNIT' | 'INVALID_VALUE' };

/** Convert an area measurement to square meters. Rejects non-finite and non-positive input. */
export function toSquareMeters(
	value: number,
	unit: AreaUnit,
): AreaConversionResult {
	const factor = SQUARE_METERS_PER_UNIT[unit];
	if (factor === undefined) return { ok: false, reason: 'INVALID_UNIT' };
	if (!Number.isFinite(value) || value <= 0) {
		return { ok: false, reason: 'INVALID_VALUE' };
	}
	return { ok: true, squareMeters: value * factor };
}

export function isAreaUnit(value: unknown): value is AreaUnit {
	return (
		typeof value === 'string' &&
		Object.hasOwn(SQUARE_METERS_PER_UNIT, value as AreaUnit)
	);
}
