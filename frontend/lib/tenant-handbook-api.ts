import type { Disease, DiseaseType, HandbookCategoryId } from "@/lib/handbook";
import { userFetch } from "@/lib/user-fetch";

export type AreaUnitId = "M2" | "HA" | "SAO_BAC" | "SAO_TRUNG" | "CONG_NAM";

export const AREA_UNIT_OPTIONS: Array<{ id: AreaUnitId; label: string }> = [
	{ id: "M2", label: "m²" },
	{ id: "CONG_NAM", label: "Công Nam Bộ (1.000m²)" },
	{ id: "SAO_TRUNG", label: "Sào Trung Bộ (500m²)" },
	{ id: "SAO_BAC", label: "Sào Bắc Bộ (360m²)" },
	{ id: "HA", label: "Hecta (10.000m²)" },
];

export type ProtocolItem = {
	id: string;
	productId: string | null;
	productName: string | null;
	productSku: string | null;
	activeIngredient: string | null;
	doseAmount: number;
	doseUnit: string;
	perAreaAmount: number;
	perAreaUnit: AreaUnitId;
	mixing: string | null;
	usage: string | null;
	sortOrder: number;
};

export type Protocol = {
	id: string;
	name: string;
	note: string | null;
	isDefault: boolean;
	isActive: boolean;
	sortOrder: number;
	items: ProtocolItem[];
};

export type ProtocolItemInput = {
	productId?: string;
	doseAmount: number;
	doseUnit: string;
	perAreaAmount: number;
	perAreaUnit: AreaUnitId;
	mixing?: string;
	usage?: string;
};

export type ProtocolInput = {
	name: string;
	note?: string;
	isDefault?: boolean;
	isActive?: boolean;
	items: ProtocolItemInput[];
};

export type ProtocolStatus = "FULL" | "PARTIAL" | "OUT";

export type QuickProtocolItem = ProtocolItem & {
	unitId: string | null;
	unit: string | null;
	unitPrice: number | null;
	availableQty: number;
	inStock: boolean;
	needAmount: number | null;
	needUnit: string;
	packs: number | null;
	cannotComputePacks: boolean;
	cannotComputePacksReason: string | null;
};

export type QuickProtocol = {
	id: string;
	name: string;
	note: string | null;
	isDefault: boolean;
	sortOrder: number;
	status: ProtocolStatus;
	items: QuickProtocolItem[];
};

export type HandbookApiEntry = {
	id: string;
	name: string;
	aliases: string[];
	category: HandbookCategoryId;
	categoryLabel: string;
	subject: string | null;
	type: string | null;
	symptom: string | null;
	note: string | null;
	recommendedIngredients: string[];
	pinnedProductIds: string[];
	excludedProductIds: string[];
	isPinned: boolean;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
	legacyDomain?: string;
};

export type HandbookListResponse = {
	items: HandbookApiEntry[];
	page: number;
	pageSize: number;
	total: number;
};

export type QuickHandbookSuggestion = {
	productId: string;
	name: string;
	unitId: string;
	unit: string;
	unitPrice: number;
	availableQty: number;
	available: boolean;
	reason: string;
	warnings: string[];
};

export type QuickHandbookResponse = {
	disease: {
		id: string;
		name: string;
		category: string;
		symptom: string | null;
		aliases: unknown;
		note: string | null;
		formulaExpr: string | null;
	};
	consultFields: Array<{
		fieldKey: string;
		label: string;
		fieldType: string;
		unit: string | null;
		required: boolean;
		options: unknown;
		sortOrder: number;
	}>;
	suggestions: QuickHandbookSuggestion[];
	area: { value: number; unit: AreaUnitId; squareMeters: number } | null;
	protocols: QuickProtocol[];
};

export type HandbookEntryInput = {
	name: string;
	category: Exclude<HandbookCategoryId, "UNCATEGORIZED">;
	subject?: string;
	type?: "DISEASE" | "PEST" | "WEED" | "OTHER";
	symptom?: string;
	note?: string;
	aliases?: string[];
	recommendedIngredients?: string[];
};

const base = "/tenant/handbook";

function queryString(params: Record<string, string | number | undefined>) {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== "") query.set(key, String(value));
	}
	return query.size ? `?${query.toString()}` : "";
}

/** UI type (lowercase) → API DiseaseType. epidemic → OTHER. */
export function toApiDiseaseType(
	type: DiseaseType | undefined,
): HandbookEntryInput["type"] | undefined {
	if (!type) return undefined;
	if (type === "epidemic") return "OTHER";
	if (type === "disease") return "DISEASE";
	if (type === "pest") return "PEST";
	if (type === "weed") return "WEED";
	return "OTHER";
}

export function fromApiDiseaseType(
	type: string | null | undefined,
): DiseaseType {
	switch (type) {
		case "DISEASE":
			return "disease";
		case "PEST":
			return "pest";
		case "WEED":
			return "weed";
		case "OTHER":
			return "epidemic";
		default:
			return "disease";
	}
}

export function toDisease(entry: HandbookApiEntry): Disease {
	return {
		id: entry.id,
		code: entry.id.slice(0, 8).toUpperCase(),
		name: entry.name,
		aliases: entry.aliases ?? [],
		category: entry.category,
		subject: entry.subject ?? "",
		type: fromApiDiseaseType(entry.type),
		symptom: entry.symptom ?? "",
		note: entry.note ?? undefined,
		recommendedIngredients: entry.recommendedIngredients ?? [],
		pinnedProductIds: entry.pinnedProductIds ?? [],
		excludedProductIds: entry.excludedProductIds ?? [],
		updatedBy: "—",
		updatedAt: entry.updatedAt?.slice(0, 10) ?? "",
	};
}

export function listHandbookCategories() {
	return userFetch<{
		items: Array<{ id: string; label: string; selectable: boolean }>;
	}>(`${base}/categories`);
}

export function listHandbookEntries(
	params: {
		search?: string;
		category?: HandbookCategoryId | "all";
		page?: number;
		pageSize?: number;
	} = {},
) {
	const { category, ...rest } = params;
	return userFetch<HandbookListResponse>(
		`${base}${queryString({
			...rest,
			category: category && category !== "all" ? category : undefined,
		})}`,
	);
}

export function getHandbookEntry(id: string) {
	return userFetch<HandbookApiEntry & { protocols?: Protocol[] }>(
		`${base}/${id}`,
	);
}

export function getQuickHandbookSuggestions(
	id: string,
	area?: { value: number; unit: AreaUnitId },
) {
	return userFetch<QuickHandbookResponse>(
		`${base}/${id}/quick-suggestions${queryString({
			areaValue: area?.value,
			areaUnit: area?.unit,
		})}`,
	);
}

export function replaceHandbookProtocols(
	id: string,
	protocols: ProtocolInput[],
) {
	return userFetch<{ protocols: Protocol[] }>(`${base}/${id}/protocols`, {
		method: "PUT",
		body: JSON.stringify({ protocols }),
	});
}

export function createHandbookEntry(input: HandbookEntryInput) {
	return userFetch<HandbookApiEntry>(base, {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export function updateHandbookEntry(
	id: string,
	input: Partial<HandbookEntryInput>,
) {
	return userFetch<HandbookApiEntry>(`${base}/${id}`, {
		method: "PATCH",
		body: JSON.stringify(input),
	});
}
