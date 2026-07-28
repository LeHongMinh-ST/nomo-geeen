import { BadRequestException } from '@nestjs/common';
import { BusinessGroup, ProductKind } from '@prisma/client';
import {
	assertSelectableBusinessGroup,
	BUSINESS_GROUP_CATALOG,
	CROP_INPUT_PRODUCT_TYPE_CATALOG,
	resolveBusinessGroup,
	validateProductContract,
} from './product-contract';

describe('product contract', () => {
	it('keeps the five groups in the approved order', () => {
		expect(BUSINESS_GROUP_CATALOG.map((item) => item.id)).toEqual([
			BusinessGroup.CROP_INPUTS,
			BusinessGroup.CROP_SEEDLINGS,
			BusinessGroup.ANIMAL_FEED,
			BusinessGroup.VETERINARY_DRUGS,
			BusinessGroup.HUMAN_DRUGS,
		]);
		expect(BUSINESS_GROUP_CATALOG[0].label).toBe(
			'Thuốc bảo vệ thực vật + Phân bón',
		);
	});

	it('validates a pesticide contract and rejects an incompatible group', () => {
		expect(() =>
			validateProductContract(
				ProductKind.PESTICIDE,
				BusinessGroup.CROP_INPUTS,
				{
					activeIngredient: 'Abamectin',
					concentration: '3.6%',
				},
			),
		).not.toThrow();
		expect(() =>
			validateProductContract(
				ProductKind.PESTICIDE,
				BusinessGroup.ANIMAL_FEED,
				{},
			),
		).toThrow(BadRequestException);
	});

	it('exposes the six BA crop-input product types', () => {
		expect(CROP_INPUT_PRODUCT_TYPE_CATALOG.map((item) => item.label)).toEqual([
			'Thuốc bảo vệ thực vật',
			'Phân bón',
			'Chế phẩm sinh học',
			'Chất điều hòa sinh trưởng',
			'Chất cải tạo đất',
			'Vật tư nông nghiệp',
		]);
		expect(resolveBusinessGroup(ProductKind.SOIL_AMENDMENT)).toBe(
			BusinessGroup.CROP_INPUTS,
		);
	});

	it('requires group-specific attrs', () => {
		expect(() =>
			validateProductContract(
				ProductKind.VET_DRUG,
				BusinessGroup.VETERINARY_DRUGS,
				{},
			),
		).toThrow('attrs.activeIngredient is required for VET_DRUG');
	});

	it('supports mixed and specialist tenant profiles', () => {
		expect(() =>
			assertSelectableBusinessGroup(BusinessGroup.CROP_INPUTS, [
				{ businessGroup: BusinessGroup.CROP_INPUTS, enabled: true },
				{ businessGroup: BusinessGroup.ANIMAL_FEED, enabled: true },
			]),
		).not.toThrow();
		expect(() =>
			assertSelectableBusinessGroup(BusinessGroup.ANIMAL_FEED, [
				{ businessGroup: BusinessGroup.CROP_INPUTS, enabled: true },
			]),
		).toThrow('businessGroup is not enabled for this tenant');
	});

	it('maps legacy crop seed without mutating the source value', () => {
		expect(resolveBusinessGroup(ProductKind.CROP_SEED, 'CROP')).toBe(
			BusinessGroup.CROP_SEEDLINGS,
		);
		expect(resolveBusinessGroup(ProductKind.OTHER, 'GENERAL')).toBeNull();
	});

	describe('specialized attrs decided by ProductKind', () => {
		const pesticideBase = {
			activeIngredient: 'Abamectin',
			concentration: '3.6%',
		};
		const vetBase = { activeIngredient: 'Amoxicillin', dosageForm: 'Bột' };
		const fertilizerBase = { composition: 'NPK 16-16-8' };

		function validatePesticide(attrs: Record<string, unknown>) {
			return validateProductContract(
				ProductKind.PESTICIDE,
				BusinessGroup.CROP_INPUTS,
				{ ...pesticideBase, ...attrs },
				true,
			);
		}

		function validateVetDrug(attrs: Record<string, unknown>) {
			return validateProductContract(
				ProductKind.VET_DRUG,
				BusinessGroup.VETERINARY_DRUGS,
				{ ...vetBase, ...attrs },
				true,
			);
		}

		function validateFertilizer(attrs: Record<string, unknown>) {
			return validateProductContract(
				ProductKind.FERTILIZER,
				BusinessGroup.CROP_INPUTS,
				{ ...fertilizerBase, ...attrs },
				true,
			);
		}

		it('requires PHI and REI on a pesticide', () => {
			expect(() => validatePesticide({})).toThrow(
				'attrs.phiDays is required for PESTICIDE',
			);
			expect(() => validatePesticide({ phiDays: 7 })).toThrow(
				'attrs.reiDays is required for PESTICIDE',
			);
			expect(() => validatePesticide({ phiDays: 7, reiDays: 1 })).not.toThrow();
		});

		it('requires all three withdrawal periods on a veterinary drug', () => {
			expect(() => validateVetDrug({})).toThrow(
				'attrs.withdrawalMeatDays is required for VET_DRUG',
			);
			expect(() =>
				validateVetDrug({ withdrawalMeatDays: 14, withdrawalMilkDays: 5 }),
			).toThrow('attrs.withdrawalEggDays is required for VET_DRUG');
			expect(() =>
				validateVetDrug({
					withdrawalMeatDays: 14,
					withdrawalMilkDays: 5,
					withdrawalEggDays: 0,
				}),
			).not.toThrow();
		});

		it('requires the NPK nutrient percentages on a fertilizer', () => {
			expect(() => validateFertilizer({})).toThrow(
				'attrs.nitrogenPercent is required for FERTILIZER',
			);
			expect(() =>
				validateFertilizer({
					nitrogenPercent: 16,
					phosphorusPercent: 16,
					potassiumPercent: 8,
				}),
			).not.toThrow();
		});

		it('accepts snake_case spellings and numeric strings', () => {
			expect(() =>
				validatePesticide({ phi_days: '7', rei_days: '1' }),
			).not.toThrow();
			expect(() =>
				validateVetDrug({
					withdrawal_meat_days: '14',
					withdrawal_milk_days: '5',
					withdrawal_egg_days: '2',
				}),
			).not.toThrow();
		});

		it('accepts zero as a real waiting period', () => {
			expect(() => validatePesticide({ phiDays: 0, reiDays: 0 })).not.toThrow();
		});

		it('rejects negative, non-numeric, and boolean values', () => {
			expect(() => validatePesticide({ phiDays: -1, reiDays: 1 })).toThrow(
				'attrs.phiDays must be a non-negative number for PESTICIDE',
			);
			expect(() => validatePesticide({ phiDays: 'abc', reiDays: 1 })).toThrow(
				'attrs.phiDays must be a non-negative number for PESTICIDE',
			);
			expect(() => validatePesticide({ phiDays: true, reiDays: 1 })).toThrow(
				'attrs.phiDays must be a non-negative number for PESTICIDE',
			);
		});

		it('rejects crop PHI/REI keys on a fertilizer', () => {
			expect(() =>
				validateFertilizer({
					nitrogenPercent: 16,
					phosphorusPercent: 16,
					potassiumPercent: 8,
					phiDays: 7,
				}),
			).toThrow('attrs.phiDays is not allowed for FERTILIZER');
		});

		it('rejects crop PHI/REI keys on a veterinary drug', () => {
			expect(() =>
				validateVetDrug({
					withdrawalMeatDays: 14,
					withdrawalMilkDays: 5,
					withdrawalEggDays: 2,
					rei_days: 21,
				}),
			).toThrow('attrs.rei_days is not allowed for VET_DRUG');
		});

		it('rejects veterinary withdrawal keys on a pesticide', () => {
			expect(() =>
				validatePesticide({
					phiDays: 7,
					reiDays: 1,
					withdrawalMeatDays: 14,
				}),
			).toThrow('attrs.withdrawalMeatDays is not allowed for PESTICIDE');
		});

		it('rejects nutrient keys on a non-fertilizer kind', () => {
			expect(() =>
				validateProductContract(
					ProductKind.SEED,
					BusinessGroup.CROP_SEEDLINGS,
					{ species: 'Lúa', variety: 'OM5451', nitrogenPercent: 16 },
					true,
				),
			).toThrow('attrs.nitrogenPercent is not allowed for SEED');
		});

		it('skips the specialized rules when attrs are not supplied', () => {
			expect(() =>
				validateProductContract(
					ProductKind.PESTICIDE,
					BusinessGroup.CROP_INPUTS,
					pesticideBase,
				),
			).not.toThrow();
			expect(() =>
				validateProductContract(
					ProductKind.VET_DRUG,
					BusinessGroup.VETERINARY_DRUGS,
					{ ...vetBase, phiDays: 7 },
					false,
				),
			).not.toThrow();
		});
	});
});
