import { BadRequestException } from '@nestjs/common';
import { BusinessGroup, ProductKind } from '@prisma/client';

export const BUSINESS_GROUP_CATALOG = [
	{ id: BusinessGroup.CROP_INPUTS, label: 'Thuốc bảo vệ thực vật + Phân bón' },
	{ id: BusinessGroup.CROP_SEEDLINGS, label: 'Cây giống' },
	{ id: BusinessGroup.ANIMAL_FEED, label: 'Thức ăn chăn nuôi' },
	{ id: BusinessGroup.VETERINARY_DRUGS, label: 'Thuốc thú y' },
	{ id: BusinessGroup.LIVESTOCK, label: 'Con giống' },
] as const;

/** Canonical crop-input types from the BA brief. Category remains a store label. */
export const CROP_INPUT_PRODUCT_TYPE_CATALOG = [
	{ id: ProductKind.PESTICIDE, label: 'Thuốc bảo vệ thực vật' },
	{ id: ProductKind.FERTILIZER, label: 'Phân bón' },
	{ id: ProductKind.BIOLOGICAL_PRODUCT, label: 'Chế phẩm sinh học' },
	{ id: ProductKind.GROWTH_REGULATOR, label: 'Chất điều hòa sinh trưởng' },
	{ id: ProductKind.SOIL_AMENDMENT, label: 'Chất cải tạo đất' },
	{ id: ProductKind.AGRI_MATERIAL, label: 'Vật tư nông nghiệp' },
] as const;

const KIND_GROUP: Partial<Record<ProductKind, BusinessGroup>> = {
	[ProductKind.PESTICIDE]: BusinessGroup.CROP_INPUTS,
	[ProductKind.FERTILIZER]: BusinessGroup.CROP_INPUTS,
	[ProductKind.BIOLOGICAL_PRODUCT]: BusinessGroup.CROP_INPUTS,
	[ProductKind.GROWTH_REGULATOR]: BusinessGroup.CROP_INPUTS,
	[ProductKind.SOIL_AMENDMENT]: BusinessGroup.CROP_INPUTS,
	[ProductKind.AGRI_MATERIAL]: BusinessGroup.CROP_INPUTS,
	[ProductKind.CROP_SEED]: BusinessGroup.CROP_SEEDLINGS,
	[ProductKind.SEED]: BusinessGroup.CROP_SEEDLINGS,
	[ProductKind.SEEDLING]: BusinessGroup.CROP_SEEDLINGS,
	[ProductKind.ANIMAL_FEED]: BusinessGroup.ANIMAL_FEED,
	[ProductKind.VET_DRUG]: BusinessGroup.VETERINARY_DRUGS,
	[ProductKind.LIVESTOCK_SEED]: BusinessGroup.LIVESTOCK,
};

const REQUIRED_ATTRS: Partial<Record<ProductKind, string[]>> = {
	[ProductKind.PESTICIDE]: ['activeIngredient', 'concentration'],
	[ProductKind.FERTILIZER]: ['composition'],
	[ProductKind.BIOLOGICAL_PRODUCT]: ['composition'],
	[ProductKind.GROWTH_REGULATOR]: ['composition'],
	[ProductKind.SOIL_AMENDMENT]: ['composition'],
	[ProductKind.SEED]: ['species', 'variety'],
	[ProductKind.SEEDLING]: ['species', 'variety'],
	[ProductKind.ANIMAL_FEED]: ['animalSpecies', 'feedForm'],
	[ProductKind.VET_DRUG]: ['activeIngredient', 'dosageForm'],
	[ProductKind.LIVESTOCK_SEED]: ['species', 'breed'],
};

export function resolveBusinessGroup(
	productKind?: ProductKind | null,
	legacyDomain?: string | null,
): BusinessGroup | null {
	if (productKind && KIND_GROUP[productKind])
		return KIND_GROUP[productKind] ?? null;
	if (productKind === ProductKind.CROP_SEED && legacyDomain === 'CROP') {
		return BusinessGroup.CROP_SEEDLINGS;
	}
	return null;
}

export function validateProductContract(
	productKind?: ProductKind | null,
	businessGroup?: BusinessGroup | null,
	attrs?: unknown,
) {
	if (!productKind && !businessGroup) return;
	if (!productKind || !businessGroup) {
		throw new BadRequestException(
			'productKind and businessGroup must be provided together',
		);
	}
	const expected = KIND_GROUP[productKind];
	if (!expected || expected !== businessGroup) {
		throw new BadRequestException(
			'productKind is incompatible with businessGroup',
		);
	}
	if (
		attrs !== undefined &&
		(attrs === null || typeof attrs !== 'object' || Array.isArray(attrs))
	) {
		throw new BadRequestException('attrs must be an object');
	}
	for (const key of REQUIRED_ATTRS[productKind] ?? []) {
		const value = (attrs as Record<string, unknown> | undefined)?.[key];
		if (typeof value !== 'string' || !value.trim()) {
			throw new BadRequestException(
				`attrs.${key} is required for ${productKind}`,
			);
		}
	}
}

export function assertSelectableBusinessGroup(
	group: BusinessGroup,
	configuredGroups: Array<{ businessGroup: BusinessGroup; enabled: boolean }>,
) {
	if (
		configuredGroups.length > 0 &&
		!configuredGroups.some(
			(item) => item.businessGroup === group && item.enabled,
		)
	) {
		throw new BadRequestException(
			'businessGroup is not enabled for this tenant',
		);
	}
}
