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
			BusinessGroup.LIVESTOCK,
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
});
