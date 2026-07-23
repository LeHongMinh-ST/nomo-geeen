import type { Disease, DiseaseType, HandbookCategoryId } from "@/lib/handbook";
import { userFetch } from "@/lib/user-fetch";

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

/** FE mock type (lowercase) → API DiseaseType. epidemic → OTHER. */
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
	return userFetch<HandbookApiEntry>(`${base}/${id}`);
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
