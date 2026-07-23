export const BUSINESS_GROUP_CATALOG = [
	{ id: "CROP_INPUTS", label: "Vật tư trồng trọt" },
	{ id: "CROP_SEEDLINGS", label: "Giống cây trồng" },
	{ id: "ANIMAL_FEED", label: "Thức ăn chăn nuôi" },
	{ id: "VETERINARY_DRUGS", label: "Thuốc thú y" },
	{ id: "LIVESTOCK", label: "Giống vật nuôi" },
] as const;

export type BusinessGroupId = (typeof BUSINESS_GROUP_CATALOG)[number]["id"];

export type ProductKindId =
	| "PESTICIDE"
	| "FERTILIZER"
	| "BIOLOGICAL_PRODUCT"
	| "GROWTH_REGULATOR"
	| "SOIL_AMENDMENT"
	| "AGRI_MATERIAL"
	| "CROP_SEED"
	| "SEED"
	| "SEEDLING"
	| "ANIMAL_FEED"
	| "VET_DRUG"
	| "LIVESTOCK_SEED";

export type ProductKindField = {
	key: string;
	label: string;
	input: "text" | "number";
	optional?: boolean;
};

type ProductKindDefinition = {
	id: ProductKindId;
	label: string;
	businessGroup: BusinessGroupId;
	requiredAttrs: readonly string[];
	fields: readonly ProductKindField[];
};

const COMMON_CROP_FIELDS = [
	{ key: "composition", label: "Thành phần", input: "text" },
	{ key: "registrationNumber", label: "Số đăng ký", input: "text", optional: true },
	{ key: "manufacturer", label: "Nhà sản xuất", input: "text", optional: true },
] as const satisfies readonly ProductKindField[];

export const PRODUCT_KIND_CATALOG: readonly ProductKindDefinition[] = [
	{ id: "PESTICIDE", label: "Thuốc bảo vệ thực vật", businessGroup: "CROP_INPUTS", requiredAttrs: ["activeIngredient", "concentration"], fields: [{ key: "activeIngredient", label: "Hoạt chất", input: "text" }, { key: "concentration", label: "Nồng độ / hàm lượng", input: "text" }, { key: "phiDays", label: "Thời gian cách ly (ngày)", input: "number", optional: true }, { key: "reiDays", label: "Thời gian tái nhập (ngày)", input: "number", optional: true }] },
	{ id: "FERTILIZER", label: "Phân bón", businessGroup: "CROP_INPUTS", requiredAttrs: ["composition"], fields: COMMON_CROP_FIELDS },
	{ id: "BIOLOGICAL_PRODUCT", label: "Chế phẩm sinh học", businessGroup: "CROP_INPUTS", requiredAttrs: ["composition"], fields: COMMON_CROP_FIELDS },
	{ id: "GROWTH_REGULATOR", label: "Chất điều hòa sinh trưởng", businessGroup: "CROP_INPUTS", requiredAttrs: ["composition"], fields: COMMON_CROP_FIELDS },
	{ id: "SOIL_AMENDMENT", label: "Chất cải tạo đất", businessGroup: "CROP_INPUTS", requiredAttrs: ["composition"], fields: COMMON_CROP_FIELDS },
	{ id: "AGRI_MATERIAL", label: "Vật tư nông nghiệp khác", businessGroup: "CROP_INPUTS", requiredAttrs: [], fields: [{ key: "materialType", label: "Loại vật tư", input: "text" }] },
	{ id: "CROP_SEED", label: "Giống cây trồng", businessGroup: "CROP_SEEDLINGS", requiredAttrs: [], fields: [{ key: "species", label: "Loài cây", input: "text", optional: true }, { key: "variety", label: "Giống", input: "text", optional: true }] },
	{ id: "SEED", label: "Hạt giống", businessGroup: "CROP_SEEDLINGS", requiredAttrs: ["species", "variety"], fields: [{ key: "species", label: "Loài cây", input: "text" }, { key: "variety", label: "Tên giống", input: "text" }] },
	{ id: "SEEDLING", label: "Cây giống", businessGroup: "CROP_SEEDLINGS", requiredAttrs: ["species", "variety"], fields: [{ key: "species", label: "Loài cây", input: "text" }, { key: "variety", label: "Tên giống", input: "text" }] },
	{ id: "ANIMAL_FEED", label: "Thức ăn chăn nuôi", businessGroup: "ANIMAL_FEED", requiredAttrs: ["animalSpecies", "feedForm"], fields: [{ key: "animalSpecies", label: "Vật nuôi sử dụng", input: "text" }, { key: "feedForm", label: "Dạng thức ăn", input: "text" }] },
	{ id: "VET_DRUG", label: "Thuốc thú y", businessGroup: "VETERINARY_DRUGS", requiredAttrs: ["activeIngredient", "dosageForm"], fields: [{ key: "activeIngredient", label: "Hoạt chất", input: "text" }, { key: "dosageForm", label: "Dạng bào chế", input: "text" }] },
	{ id: "LIVESTOCK_SEED", label: "Giống vật nuôi", businessGroup: "LIVESTOCK", requiredAttrs: ["species", "breed"], fields: [{ key: "species", label: "Loài vật nuôi", input: "text" }, { key: "breed", label: "Giống", input: "text" }] },
];

const KIND_BY_ID = new Map(PRODUCT_KIND_CATALOG.map((kind) => [kind.id, kind]));

export type TenantBusinessGroup = {
	businessGroup: string;
	enabled: boolean;
};

export function getProductKindsForGroup(group: BusinessGroupId) {
	return PRODUCT_KIND_CATALOG.filter((kind) => kind.businessGroup === group);
}

export function getProductKindDefinition(kind: string | null | undefined) {
	return kind ? KIND_BY_ID.get(kind as ProductKindId) : undefined;
}

export function getRequiredAttrKeys(kind: string | null | undefined): readonly string[] {
	return getProductKindDefinition(kind)?.requiredAttrs ?? [];
}

export function normalizeProductAttrs(
	kind: string | null | undefined,
	attrs: Record<string, string>,
): Record<string, string | number> {
	const fields = getProductKindDefinition(kind)?.fields ?? [];
	return Object.fromEntries(
		fields
			.map((field) => [field.key, attrs[field.key]?.trim() ?? ""] as const)
			.filter(([, value]) => value !== "")
			.map(([key, value]) => [key, fields.find((field) => field.key === key)?.input === "number" ? Number(value) : value]),
	);
}

export function isCompatibleProductKind(
	kind: string | null | undefined,
	group: string | null | undefined,
): kind is ProductKindId {
	return Boolean(getProductKindDefinition(kind)?.businessGroup === group);
}

export function filterEnabledBusinessGroups(
	groups: readonly TenantBusinessGroup[],
): typeof BUSINESS_GROUP_CATALOG[number][] {
	const enabled = new Set(groups.filter((group) => group.enabled).map((group) => group.businessGroup));
	return BUSINESS_GROUP_CATALOG.filter((group) => enabled.has(group.id));
}

export function resolveEnabledBusinessGroups(
	configured: boolean,
	groups: readonly TenantBusinessGroup[],
): typeof BUSINESS_GROUP_CATALOG[number][] {
	return configured ? filterEnabledBusinessGroups(groups) : [...BUSINESS_GROUP_CATALOG];
}

const LEGACY_KIND_ALIASES: Record<string, ProductKindId> = {
	PESTICIDE: "PESTICIDE",
	FERTILIZER: "FERTILIZER",
	BIOLOGICAL_PRODUCT: "BIOLOGICAL_PRODUCT",
	GROWTH_REGULATOR: "GROWTH_REGULATOR",
	SOIL_AMENDMENT: "SOIL_AMENDMENT",
	AGRI_MATERIAL: "AGRI_MATERIAL",
	SEED: "SEED",
	SEEDLING: "SEEDLING",
	CROP_SEED: "CROP_SEED",
	ANIMAL_FEED: "ANIMAL_FEED",
	VET_DRUG: "VET_DRUG",
	LIVESTOCK_SEED: "LIVESTOCK_SEED",
};

export function resolveLegacyProductKind(
	productKind?: string | null,
	legacyType?: string | null,
): ProductKindId | null {
	const candidate = productKind ?? legacyType;
	if (!candidate) return null;
	return LEGACY_KIND_ALIASES[candidate.toUpperCase()] ?? null;
}
