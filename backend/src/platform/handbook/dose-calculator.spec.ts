import { calculateDose, type DoseInput } from './dose-calculator';

const base: DoseInput = {
	doseAmount: 25,
	doseUnit: 'ml',
	perAreaAmount: 1_000,
	perAreaUnit: 'M2',
	areaSquareMeters: 3_000,
	netContent: 100,
	netContentUnit: 'ml',
};

describe('calculateDose', () => {
	it('scales the dose by area and rounds packs up', () => {
		const result = calculateDose(base);
		expect(result).toMatchObject({
			ok: true,
			needAmount: 75,
			needUnit: 'ml',
			packs: 1,
			cannotComputePacks: false,
		});
	});

	it('rounds partial packs up to the next whole pack', () => {
		const result = calculateDose({ ...base, areaSquareMeters: 5_000 });
		// 125ml needed against a 100ml bottle -> 2 bottles
		expect(result).toMatchObject({ ok: true, needAmount: 125, packs: 2 });
	});

	it('converts across units inside the same family', () => {
		const result = calculateDose({
			...base,
			doseAmount: 2,
			doseUnit: 'l',
			netContent: 500,
			netContentUnit: 'ml',
			areaSquareMeters: 1_000,
		});
		// 2L needed, 500ml bottles -> 4 bottles
		expect(result).toMatchObject({ ok: true, needAmount: 2, packs: 4 });
	});

	it('handles a per-hectare dose against a small plot', () => {
		const result = calculateDose({
			...base,
			doseAmount: 1_000,
			doseUnit: 'ml',
			perAreaAmount: 1,
			perAreaUnit: 'HA',
			areaSquareMeters: 360,
		});
		expect(result).toMatchObject({ ok: true, needAmount: 36, packs: 1 });
	});

	it('reports mismatched unit families instead of guessing', () => {
		const result = calculateDose({ ...base, netContentUnit: 'kg' });
		expect(result).toMatchObject({
			ok: true,
			needAmount: 75,
			packs: null,
			cannotComputePacks: true,
			cannotComputePacksReason: 'UNIT_FAMILY_MISMATCH',
		});
	});

	it.each([
		[{ netContent: null }, 'MISSING_NET_CONTENT'],
		[{ netContent: 0 }, 'MISSING_NET_CONTENT'],
		[{ doseUnit: 'gói' }, 'UNKNOWN_DOSE_UNIT'],
		[{ netContentUnit: 'chai' }, 'UNKNOWN_PACK_UNIT'],
	] as const)('cannot compute packs for %p', (patch, reason) => {
		const result = calculateDose({ ...base, ...patch });
		expect(result).toMatchObject({
			ok: true,
			cannotComputePacks: true,
			cannotComputePacksReason: reason,
			packs: null,
		});
		// The dose itself is still returned so the counter can advise manually.
		expect(result).toHaveProperty('needAmount', 75);
	});

	it.each([
		[{ doseAmount: 0 }, 'INVALID_DOSE'],
		[{ doseAmount: -5 }, 'INVALID_DOSE'],
		[{ areaSquareMeters: 0 }, 'INVALID_AREA'],
		[{ areaSquareMeters: Number.NaN }, 'INVALID_AREA'],
		[{ perAreaAmount: 0 }, 'INVALID_PER_AREA'],
		[{ perAreaAmount: -1 }, 'INVALID_PER_AREA'],
	] as const)('rejects invalid input %p', (patch, reason) => {
		expect(calculateDose({ ...base, ...patch })).toEqual({ ok: false, reason });
	});

	it('is case and whitespace insensitive on units', () => {
		const result = calculateDose({
			...base,
			doseUnit: ' ML ',
			netContentUnit: 'L',
			netContent: 1,
		});
		expect(result).toMatchObject({ ok: true, packs: 1 });
	});
});
