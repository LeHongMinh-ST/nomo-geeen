import { SupplierType } from '@prisma/client';
import { normalizeVietnameseSearch } from '../handbook/vietnamese-search';

/**
 * Loai nha cung cap la tu vung dong (catalog §14.1): thuoc BVTV / phan bon / ca hai.
 * Truoc day cot nay la free text nen input cu (tieng Viet co dau, tieng Anh) van con
 * ton tai. `mapSupplierType` chuan hoa best-effort ve enum; khong khop thi tra null.
 *
 * Bang token duoi day PHAI dong bo voi CASE trong migration
 * prisma/migrations/20260726120000_supplier_type_enum_purchase_manufactured_at.
 */
const CROP_PROTECTION_TOKENS = [
	'crop protection',
	'plant protection',
	'pesticide',
	'pesticides',
	'bvtv',
	'bao ve thuc vat',
	'thuoc sau',
	'thuoc tru sau',
] as const;

const FERTILIZER_TOKENS = [
	'fertilizer',
	'fertilizers',
	'fertiliser',
	'fertilisers',
	'phan bon',
] as const;

const BOTH_TOKENS = ['both', 'ca hai', 'ca 2'] as const;

/** Khop theo tu (folded text da gom moi ky tu khong phai a-z0-9 thanh 1 dau cach). */
function hasToken(folded: string, tokens: readonly string[]): boolean {
	const padded = ` ${folded} `;
	return tokens.some((token) => padded.includes(` ${token} `));
}

export function mapSupplierType(
	raw: string | null | undefined,
): SupplierType | null {
	const folded = normalizeVietnameseSearch(raw ?? '');
	if (!folded) return null;
	const cropProtection = hasToken(folded, CROP_PROTECTION_TOKENS);
	const fertilizer = hasToken(folded, FERTILIZER_TOKENS);
	if ((cropProtection && fertilizer) || hasToken(folded, BOTH_TOKENS))
		return SupplierType.BOTH;
	if (cropProtection) return SupplierType.CROP_PROTECTION;
	if (fertilizer) return SupplierType.FERTILIZER;
	return null;
}
