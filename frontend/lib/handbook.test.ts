import { describe, expect, it } from "vitest";
import {
	categoryLabel,
	getHandbookCategory,
	HANDBOOK_CATEGORY_CATALOG,
	handbookCategoryLabel,
	handbookDiseases,
	mapLegacyAgriDomain,
	mapLegacyHandbookField,
	SELECTABLE_HANDBOOK_CATEGORY_IDS,
	suggestProducts,
} from "./handbook";

describe("HandbookCategory contract", () => {
	it("exposes exactly five selectable categories in approved order", () => {
		const selectable = HANDBOOK_CATEGORY_CATALOG.filter((c) => c.selectable);
		expect(selectable).toHaveLength(5);
		expect(selectable.map((c) => c.id)).toEqual([
			"CROP_PROTECTION_AND_FERTILIZER",
			"CROP_SEEDLINGS",
			"ANIMAL_FEED",
			"VETERINARY_DRUGS",
			"LIVESTOCK",
		]);
		expect(SELECTABLE_HANDBOOK_CATEGORY_IDS).toEqual([
			"CROP_PROTECTION_AND_FERTILIZER",
			"CROP_SEEDLINGS",
			"ANIMAL_FEED",
			"VETERINARY_DRUGS",
			"LIVESTOCK",
		]);
	});

	it("uses exact Vietnamese labels and combined first category", () => {
		expect(categoryLabel.CROP_PROTECTION_AND_FERTILIZER).toBe(
			"Thuốc bảo vệ thực vật + Phân bón",
		);
		expect(categoryLabel.CROP_SEEDLINGS).toBe("Cây giống");
		expect(categoryLabel.ANIMAL_FEED).toBe("Thức ăn chăn nuôi");
		expect(categoryLabel.VETERINARY_DRUGS).toBe("Thuốc thú y");
		expect(categoryLabel.LIVESTOCK).toBe("Con giống");
		expect(categoryLabel.UNCATEGORIZED).toBe("Chưa phân loại");
		// First group is one option, not two
		const labels = HANDBOOK_CATEGORY_CATALOG.filter((c) => c.selectable).map(
			(c) => c.label,
		);
		expect(labels.filter((l) => l.includes("Phân bón"))).toHaveLength(1);
		expect(labels.some((l) => l === "Thủy sản")).toBe(false);
	});

	it("marks UNCATEGORIZED non-selectable", () => {
		expect(getHandbookCategory("UNCATEGORIZED").selectable).toBe(false);
		for (const id of SELECTABLE_HANDBOOK_CATEGORY_IDS) {
			expect(getHandbookCategory(id).selectable).toBe(true);
		}
	});

	it("maps unknown/null/deprecated IDs to Chưa phân loại without inventing a core category", () => {
		expect(getHandbookCategory(null).id).toBe("UNCATEGORIZED");
		expect(getHandbookCategory(undefined).id).toBe("UNCATEGORIZED");
		expect(getHandbookCategory("").id).toBe("UNCATEGORIZED");
		expect(getHandbookCategory("CROP")).toEqual(
			expect.objectContaining({
				id: "UNCATEGORIZED",
				label: "Chưa phân loại",
			}),
		);
		expect(getHandbookCategory("random-junk").label).toBe("Chưa phân loại");
		expect(handbookCategoryLabel("not-a-category")).toBe("Chưa phân loại");
	});

	it("maps AgriDomain legacy values with lossless uncategorized fallback", () => {
		expect(mapLegacyAgriDomain("CROP")).toBe("CROP_PROTECTION_AND_FERTILIZER");
		expect(mapLegacyAgriDomain("LIVESTOCK")).toBe("VETERINARY_DRUGS");
		expect(mapLegacyAgriDomain("AQUACULTURE")).toBe("UNCATEGORIZED");
		expect(mapLegacyAgriDomain("GENERAL")).toBe("UNCATEGORIZED");
		expect(mapLegacyAgriDomain(null)).toBe("UNCATEGORIZED");
		expect(mapLegacyAgriDomain("WEIRD")).toBe("UNCATEGORIZED");
	});

	it("maps old FE HandbookField values", () => {
		expect(mapLegacyHandbookField("cultivation")).toBe(
			"CROP_PROTECTION_AND_FERTILIZER",
		);
		expect(mapLegacyHandbookField("livestock")).toBe("VETERINARY_DRUGS");
		expect(mapLegacyHandbookField("aquaculture")).toBe("UNCATEGORIZED");
		expect(mapLegacyHandbookField("ANIMAL_FEED")).toBe("ANIMAL_FEED");
	});

	it("mock diseases use category field", () => {
		for (const d of handbookDiseases) {
			expect(d.category).toBeTruthy();
			expect(getHandbookCategory(d.category).id).toBe(d.category);
		}
	});

	it("does not change suggestProducts ranking contract", () => {
		const disease = handbookDiseases.find((d) => d.id === "st-raynau");
		expect(disease).toBeDefined();
		const suggestions = suggestProducts(disease!);
		// Pinned product p2 should rank first when present
		if (suggestions.length > 0 && disease!.pinnedProductIds.includes("p2")) {
			expect(suggestions[0].reason).toBe("pinned");
		}
		// Function still returns array (no throw)
		expect(Array.isArray(suggestions)).toBe(true);
	});
});

// Keep in sync with backend/src/platform/handbook/handbook-category.ts
const BACKEND_LABELS = [
	"Thuốc bảo vệ thực vật + Phân bón",
	"Cây giống",
	"Thức ăn chăn nuôi",
	"Thuốc thú y",
	"Con giống",
	"Chưa phân loại",
] as const;

describe("shared FE/BE category labels", () => {
	it("matches backend handbook-category labels", () => {
		expect(HANDBOOK_CATEGORY_CATALOG.map((c) => c.label)).toEqual([
			...BACKEND_LABELS,
		]);
	});
});
