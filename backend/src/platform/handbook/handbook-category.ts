import { HandbookCategory } from '@prisma/client';

export type HandbookCategoryOption = {
	id: HandbookCategory;
	label: string;
	selectable: boolean;
};

/** Ordered catalog — mirrors frontend contract (specs/handbook-core-catalog). */
export const HANDBOOK_CATEGORY_CATALOG: readonly HandbookCategoryOption[] = [
	{
		id: HandbookCategory.CROP_PROTECTION_AND_FERTILIZER,
		label: 'Thuốc bảo vệ thực vật + Phân bón',
		selectable: true,
	},
	{
		id: HandbookCategory.CROP_SEEDLINGS,
		label: 'Cây giống',
		selectable: true,
	},
	{
		id: HandbookCategory.ANIMAL_FEED,
		label: 'Thức ăn chăn nuôi',
		selectable: true,
	},
	{
		id: HandbookCategory.VETERINARY_DRUGS,
		label: 'Thuốc thú y',
		selectable: true,
	},
	{
		id: HandbookCategory.LIVESTOCK,
		label: 'Con giống',
		selectable: true,
	},
	{
		id: HandbookCategory.UNCATEGORIZED,
		label: 'Chưa phân loại',
		selectable: false,
	},
] as const;

const byId = Object.fromEntries(
	HANDBOOK_CATEGORY_CATALOG.map((c) => [c.id, c]),
) as Record<HandbookCategory, HandbookCategoryOption>;

export function isSelectableHandbookCategory(
	value: string | null | undefined,
): value is HandbookCategory {
	if (!value) return false;
	const opt = byId[value as HandbookCategory];
	return Boolean(opt?.selectable);
}

export function handbookCategoryLabel(id: HandbookCategory | string): string {
	return byId[id as HandbookCategory]?.label ?? byId.UNCATEGORIZED.label;
}

export function mapLegacyAgriDomain(
	domain: string | null | undefined,
): HandbookCategory {
	switch (domain) {
		case 'CROP':
			return HandbookCategory.CROP_PROTECTION_AND_FERTILIZER;
		case 'LIVESTOCK':
			return HandbookCategory.VETERINARY_DRUGS;
		default:
			return HandbookCategory.UNCATEGORIZED;
	}
}
