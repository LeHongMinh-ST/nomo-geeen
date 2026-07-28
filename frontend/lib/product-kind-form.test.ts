import { describe, expect, it } from "vitest";
import {
	BUSINESS_GROUP_CATALOG,
	businessGroupLabel,
	filterEnabledBusinessGroups,
	getProductKindsForGroup,
	getRequiredAttrKeys,
	isCompatibleProductKind,
	normalizeProductAttrs,
	productKindLabel,
	resolveLegacyProductKind,
} from "@/lib/product-kind-form";

describe("product kind contract", () => {
	it("keeps the backend business group order", () => {
		expect(BUSINESS_GROUP_CATALOG.map((group) => group.id)).toEqual([
			"CROP_INPUTS",
			"CROP_SEEDLINGS",
			"HUMAN_DRUGS",
			"ANIMAL_FEED",
			"VETERINARY_DRUGS",
		]);
	});

	it("uses the catalog §2 labels so the product form and settings agree", () => {
		expect(BUSINESS_GROUP_CATALOG.map((group) => group.label)).toEqual([
			"Thuốc bảo vệ thực vật + Phân bón",
			"Cây trồng",
			"Thuốc (dùng cho người)",
			"Thức ăn chăn nuôi",
			"Thuốc thú y",
		]);
	});

	it("maps product groups and kinds to Vietnamese labels", () => {
		expect(businessGroupLabel("CROP_INPUTS")).toBe(
			"Thuốc bảo vệ thực vật + Phân bón",
		);
		expect(businessGroupLabel("LIVESTOCK")).toBe("Con giống");
		expect(businessGroupLabel("UNKNOWN")).toBe("Chưa phân loại");
		expect(productKindLabel("FERTILIZER")).toBe("Phân bón");
		expect(productKindLabel("UNKNOWN")).toBe("Chưa phân loại");
	});

	it("filters enabled groups while preserving catalog order", () => {
		expect(
			filterEnabledBusinessGroups([
				{ businessGroup: "HUMAN_DRUGS", enabled: true },
				{ businessGroup: "CROP_INPUTS", enabled: true },
				{ businessGroup: "ANIMAL_FEED", enabled: false },
			]),
		).toEqual([
			{ id: "CROP_INPUTS", label: "Thuốc bảo vệ thực vật + Phân bón" },
			{ id: "HUMAN_DRUGS", label: "Thuốc (dùng cho người)" },
		]);
	});

	it("exposes only compatible kinds", () => {
		expect(
			getProductKindsForGroup("ANIMAL_FEED").map((kind) => kind.id),
		).toEqual(["ANIMAL_FEED"]);
		expect(isCompatibleProductKind("VET_DRUG", "ANIMAL_FEED")).toBe(false);
		expect(isCompatibleProductKind("VET_DRUG", "VETERINARY_DRUGS")).toBe(true);
	});

	it("matches required backend attrs", () => {
		expect(getRequiredAttrKeys("PESTICIDE")).toEqual([
			"activeIngredient",
			"concentration",
			"phiDays",
			"reiDays",
		]);
		expect(getRequiredAttrKeys("FERTILIZER")).toEqual([
			"composition",
			"nitrogenPercent",
			"phosphorusPercent",
			"potassiumPercent",
		]);
		expect(getRequiredAttrKeys("LIVESTOCK_SEED")).toEqual(["species", "breed"]);
	});

	it("falls back to known legacy kind values without inventing unknown data", () => {
		expect(resolveLegacyProductKind(null, "pesticide")).toBe("PESTICIDE");
		expect(resolveLegacyProductKind("VET_DRUG", "pesticide")).toBe("VET_DRUG");
		expect(resolveLegacyProductKind(null, "AQUA_PRODUCT")).toBeNull();
	});

	it("normalizes only selected kind fields and converts numeric attrs", () => {
		expect(
			normalizeProductAttrs("PESTICIDE", {
				activeIngredient: " Fipronil ",
				concentration: "800 g/kg",
				phiDays: "7",
				staleField: "ignore",
			}),
		).toEqual({
			activeIngredient: "Fipronil",
			concentration: "800 g/kg",
			phiDays: 7,
		});
	});
});
