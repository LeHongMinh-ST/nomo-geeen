import { HandbookCategory } from '@prisma/client';
import {
	HANDBOOK_CATEGORY_CATALOG,
	handbookCategoryLabel,
	isSelectableHandbookCategory,
	mapLegacyAgriDomain,
} from './handbook-category';

describe('handbook-category', () => {
	it('exposes five selectable categories in order', () => {
		const selectable = HANDBOOK_CATEGORY_CATALOG.filter((c) => c.selectable);
		expect(selectable.map((c) => c.id)).toEqual([
			HandbookCategory.CROP_PROTECTION_AND_FERTILIZER,
			HandbookCategory.CROP_SEEDLINGS,
			HandbookCategory.ANIMAL_FEED,
			HandbookCategory.VETERINARY_DRUGS,
			HandbookCategory.LIVESTOCK,
		]);
		expect(selectable[0].label).toBe('Thuốc bảo vệ thực vật + Phân bón');
	});

	it('rejects UNCATEGORIZED and unknown as selectable writes', () => {
		expect(isSelectableHandbookCategory('UNCATEGORIZED')).toBe(false);
		expect(isSelectableHandbookCategory('NOPE')).toBe(false);
		expect(
			isSelectableHandbookCategory(
				HandbookCategory.CROP_PROTECTION_AND_FERTILIZER,
			),
		).toBe(true);
	});

	it('maps legacy agri domains losslessly', () => {
		expect(mapLegacyAgriDomain('CROP')).toBe(
			HandbookCategory.CROP_PROTECTION_AND_FERTILIZER,
		);
		expect(mapLegacyAgriDomain('LIVESTOCK')).toBe(
			HandbookCategory.VETERINARY_DRUGS,
		);
		expect(mapLegacyAgriDomain('AQUACULTURE')).toBe(
			HandbookCategory.UNCATEGORIZED,
		);
		expect(mapLegacyAgriDomain('GENERAL')).toBe(HandbookCategory.UNCATEGORIZED);
	});

	it('labels unknown as Chưa phân loại', () => {
		expect(handbookCategoryLabel(HandbookCategory.UNCATEGORIZED)).toBe(
			'Chưa phân loại',
		);
		expect(handbookCategoryLabel('junk')).toBe('Chưa phân loại');
	});
});
