import { describe, expect, it } from "vitest";
import {
	BUSINESS_GROUP_CATALOG,
	filterEnabledBusinessGroups,
	getProductKindsForGroup,
	getRequiredAttrKeys,
	isCompatibleProductKind,
	normalizeProductAttrs,
	resolveLegacyProductKind,
} from "@/lib/product-kind-form";

describe("product kind contract", () => {
	it("keeps the backend business group order", () => {
		expect(BUSINESS_GROUP_CATALOG.map((group) => group.id)).toEqual([
			"CROP_INPUTS", "CROP_SEEDLINGS", "ANIMAL_FEED", "VETERINARY_DRUGS", "LIVESTOCK",
		]);
	});

	it("filters enabled groups while preserving catalog order", () => {
		expect(filterEnabledBusinessGroups([
			{ businessGroup: "LIVESTOCK", enabled: true },
			{ businessGroup: "CROP_INPUTS", enabled: true },
			{ businessGroup: "ANIMAL_FEED", enabled: false },
		])).toEqual([
			{ id: "CROP_INPUTS", label: "Vật tư trồng trọt" },
			{ id: "LIVESTOCK", label: "Giống vật nuôi" },
		]);
	});

	it("exposes only compatible kinds", () => {
		expect(getProductKindsForGroup("ANIMAL_FEED").map((kind) => kind.id)).toEqual(["ANIMAL_FEED"]);
		expect(isCompatibleProductKind("VET_DRUG", "ANIMAL_FEED")).toBe(false);
		expect(isCompatibleProductKind("VET_DRUG", "VETERINARY_DRUGS")).toBe(true);
	});

	it("matches required backend attrs", () => {
		expect(getRequiredAttrKeys("PESTICIDE")).toEqual(["activeIngredient", "concentration"]);
		expect(getRequiredAttrKeys("FERTILIZER")).toEqual(["composition"]);
		expect(getRequiredAttrKeys("LIVESTOCK_SEED")).toEqual(["species", "breed"]);
	});

	it("falls back to known legacy kind values without inventing unknown data", () => {
		expect(resolveLegacyProductKind(null, "pesticide")).toBe("PESTICIDE");
		expect(resolveLegacyProductKind("VET_DRUG", "pesticide")).toBe("VET_DRUG");
		expect(resolveLegacyProductKind(null, "AQUA_PRODUCT")).toBeNull();
	});

	it("normalizes only selected kind fields and converts numeric attrs", () => {
		expect(normalizeProductAttrs("PESTICIDE", {
			activeIngredient: " Fipronil ", concentration: "800 g/kg", phiDays: "7", staleField: "ignore",
		})).toEqual({ activeIngredient: "Fipronil", concentration: "800 g/kg", phiDays: 7 });
	});
});
