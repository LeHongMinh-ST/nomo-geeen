/** Canonical types and display catalog for the API-backed Handbook module. */

export const TODAY = "2026-07-17";

export type HandbookCategoryId =
	| "CROP_PROTECTION_AND_FERTILIZER"
	| "CROP_SEEDLINGS"
	| "ANIMAL_FEED"
	| "VETERINARY_DRUGS"
	| "LIVESTOCK"
	| "UNCATEGORIZED";

export type HandbookCategoryOption = {
	id: HandbookCategoryId;
	label: string;
	selectable: boolean;
};

export const HANDBOOK_CATEGORY_CATALOG: readonly HandbookCategoryOption[] = [
	{
		id: "CROP_PROTECTION_AND_FERTILIZER",
		label: "Thuốc bảo vệ thực vật + Phân bón",
		selectable: true,
	},
	{ id: "CROP_SEEDLINGS", label: "Cây giống", selectable: true },
	{ id: "ANIMAL_FEED", label: "Thức ăn chăn nuôi", selectable: true },
	{ id: "VETERINARY_DRUGS", label: "Thuốc thú y", selectable: true },
	{ id: "LIVESTOCK", label: "Con giống", selectable: true },
	{ id: "UNCATEGORIZED", label: "Chưa phân loại", selectable: false },
] as const;

export const SELECTABLE_HANDBOOK_CATEGORY_IDS =
	HANDBOOK_CATEGORY_CATALOG.filter((category) => category.selectable).map(
		(category) => category.id,
	);

const categoryById = Object.fromEntries(
	HANDBOOK_CATEGORY_CATALOG.map((category) => [category.id, category]),
) as Record<HandbookCategoryId, HandbookCategoryOption>;

export function getHandbookCategory(id: string | null | undefined) {
	return id && id in categoryById
		? categoryById[id as HandbookCategoryId]
		: categoryById.UNCATEGORIZED;
}

export function handbookCategoryLabel(id: string | null | undefined) {
	return getHandbookCategory(id).label;
}

export type LegacyAgriDomain =
	| "CROP"
	| "LIVESTOCK"
	| "AQUACULTURE"
	| "GENERAL"
	| string;
export type HandbookField = "cultivation" | "livestock" | "aquaculture";

export function mapLegacyAgriDomain(
	domain: LegacyAgriDomain | null | undefined,
): HandbookCategoryId {
	if (domain === "CROP") return "CROP_PROTECTION_AND_FERTILIZER";
	if (domain === "LIVESTOCK") return "VETERINARY_DRUGS";
	return "UNCATEGORIZED";
}

export function mapLegacyHandbookField(
	field: HandbookField | string | null | undefined,
): HandbookCategoryId {
	if (field === "cultivation") return "CROP_PROTECTION_AND_FERTILIZER";
	if (field === "livestock") return "VETERINARY_DRUGS";
	return getHandbookCategory(field).id;
}

export type DiseaseType = "disease" | "pest" | "weed" | "epidemic";

export type Disease = {
	id: string;
	code: string;
	name: string;
	aliases: string[];
	category: HandbookCategoryId;
	field?: HandbookField;
	subject: string;
	type: DiseaseType;
	symptom: string;
	recommendedIngredients: string[];
	dosage?: string;
	timing?: string;
	note?: string;
	pinnedProductIds: string[];
	excludedProductIds: string[];
	updatedBy: string;
	updatedAt: string;
};

export const fieldLabel: Record<HandbookField, string> = {
	cultivation: "Trồng trọt",
	livestock: "Chăn nuôi",
	aquaculture: "Thủy sản",
};

export const categoryLabel: Record<HandbookCategoryId, string> =
	Object.fromEntries(
		HANDBOOK_CATEGORY_CATALOG.map((category) => [category.id, category.label]),
	) as Record<HandbookCategoryId, string>;

export const fieldBadgeClass: Record<HandbookField, string> = {
	cultivation: "bg-[#e8f5e9] text-[#2e7d32]",
	livestock: "bg-[#fff3e0] text-[#e65100]",
	aquaculture: "bg-[#e3f2fd] text-[#1565c0]",
};

export const categoryBadgeClass: Record<HandbookCategoryId, string> = {
	CROP_PROTECTION_AND_FERTILIZER: "bg-[#e8f5e9] text-[#2e7d32]",
	CROP_SEEDLINGS: "bg-[#f1f8e9] text-[#558b2f]",
	ANIMAL_FEED: "bg-[#fff8e1] text-[#f57f17]",
	VETERINARY_DRUGS: "bg-[#fff3e0] text-[#e65100]",
	LIVESTOCK: "bg-[#fce4ec] text-[#ad1457]",
	UNCATEGORIZED: "bg-[#eceff1] text-[#546e7a]",
};

export const typeLabel: Record<DiseaseType, string> = {
	disease: "Bệnh",
	pest: "Sâu hại",
	weed: "Cỏ dại",
	epidemic: "Dịch bệnh",
};

export const typeBadgeClass: Record<DiseaseType, string> = {
	disease: "bg-[#f3e5f5] text-[#6a1b9a]",
	pest: "bg-[#fff8e1] text-[#f57f17]",
	weed: "bg-[#e0f2f1] text-[#00695c]",
	epidemic: "bg-[#ffebee] text-[#c62828]",
};
