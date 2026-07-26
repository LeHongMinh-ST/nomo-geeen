import type { AreaUnit } from '@prisma/client';
import { toSquareMeters } from './area-conversion';

/**
 * Unit families for dose/pack conversion. Only conversions inside one family are ever
 * performed — a dose in ml is never silently reconciled against a pack measured in grams.
 */
const VOLUME_IN_ML: Record<string, number> = {
	ml: 1,
	cc: 1,
	l: 1_000,
	lit: 1_000,
	lít: 1_000,
	liter: 1_000,
	litre: 1_000,
};

const MASS_IN_G: Record<string, number> = {
	g: 1,
	gr: 1,
	gam: 1,
	gram: 1,
	kg: 1_000,
	kilogram: 1_000,
};

type UnitFamily = { family: 'VOLUME' | 'MASS'; baseFactor: number };

function resolveUnit(raw: string | null | undefined): UnitFamily | null {
	if (!raw) return null;
	const key = raw.trim().toLowerCase();
	if (VOLUME_IN_ML[key] !== undefined) {
		return { family: 'VOLUME', baseFactor: VOLUME_IN_ML[key] };
	}
	if (MASS_IN_G[key] !== undefined) {
		return { family: 'MASS', baseFactor: MASS_IN_G[key] };
	}
	return null;
}

export type CannotComputePacksReason =
	| 'MISSING_NET_CONTENT'
	| 'UNKNOWN_DOSE_UNIT'
	| 'UNKNOWN_PACK_UNIT'
	| 'UNIT_FAMILY_MISMATCH';

export type DoseInput = {
	doseAmount: number;
	doseUnit: string;
	perAreaAmount: number;
	perAreaUnit: AreaUnit;
	areaSquareMeters: number;
	/** Pack size of the concrete product, when one is linked. */
	netContent?: number | null;
	netContentUnit?: string | null;
};

export type DoseResult =
	| {
			ok: true;
			needAmount: number;
			needUnit: string;
			packs: number | null;
			cannotComputePacks: boolean;
			cannotComputePacksReason: CannotComputePacksReason | null;
	  }
	| {
			ok: false;
			reason: 'INVALID_DOSE' | 'INVALID_PER_AREA' | 'INVALID_AREA';
	  };

/** Round to 6 decimals to keep float drift out of displayed doses. */
function round6(value: number): number {
	return Math.round(value * 1_000_000) / 1_000_000;
}

/**
 * needAmount = doseAmount × (area / perArea); packs = ceil(needAmount / netContent).
 * Packs are only produced when dose and pack units live in the same family — otherwise
 * the caller is told it cannot be computed rather than being handed a guess.
 */
export function calculateDose(input: DoseInput): DoseResult {
	const {
		doseAmount,
		doseUnit,
		perAreaAmount,
		perAreaUnit,
		areaSquareMeters,
		netContent,
		netContentUnit,
	} = input;

	if (!Number.isFinite(doseAmount) || doseAmount <= 0) {
		return { ok: false, reason: 'INVALID_DOSE' };
	}
	if (!Number.isFinite(areaSquareMeters) || areaSquareMeters <= 0) {
		return { ok: false, reason: 'INVALID_AREA' };
	}

	const perArea = toSquareMeters(perAreaAmount, perAreaUnit);
	if (!perArea.ok) return { ok: false, reason: 'INVALID_PER_AREA' };

	const needAmount = round6(
		doseAmount * (areaSquareMeters / perArea.squareMeters),
	);

	const cannotCompute = (reason: CannotComputePacksReason): DoseResult => ({
		ok: true,
		needAmount,
		needUnit: doseUnit,
		packs: null,
		cannotComputePacks: true,
		cannotComputePacksReason: reason,
	});

	if (
		netContent === null ||
		netContent === undefined ||
		!Number.isFinite(netContent) ||
		netContent <= 0
	) {
		return cannotCompute('MISSING_NET_CONTENT');
	}

	const dose = resolveUnit(doseUnit);
	if (!dose) return cannotCompute('UNKNOWN_DOSE_UNIT');

	const pack = resolveUnit(netContentUnit);
	if (!pack) return cannotCompute('UNKNOWN_PACK_UNIT');

	if (dose.family !== pack.family) return cannotCompute('UNIT_FAMILY_MISMATCH');

	const needInBase = needAmount * dose.baseFactor;
	const packInBase = netContent * pack.baseFactor;

	return {
		ok: true,
		needAmount,
		needUnit: doseUnit,
		packs: Math.ceil(round6(needInBase / packInBase)),
		cannotComputePacks: false,
		cannotComputePacksReason: null,
	};
}
