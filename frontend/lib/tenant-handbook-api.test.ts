import { describe, expect, it } from "vitest";
import {
	fromApiDiseaseType,
	type HandbookApiEntry,
	toApiDiseaseType,
	toDisease,
} from "./tenant-handbook-api";

describe("tenant-handbook-api mappers", () => {
	it("maps FE epidemic to API OTHER and back", () => {
		expect(toApiDiseaseType("epidemic")).toBe("OTHER");
		expect(fromApiDiseaseType("OTHER")).toBe("epidemic");
		expect(toApiDiseaseType("disease")).toBe("DISEASE");
		expect(fromApiDiseaseType("PEST")).toBe("pest");
	});

	it("toDisease preserves category and ingredients", () => {
		const entry: HandbookApiEntry = {
			id: "uuid-1",
			name: "Đạo ôn",
			aliases: ["cháy lá"],
			category: "CROP_PROTECTION_AND_FERTILIZER",
			categoryLabel: "Thuốc bảo vệ thực vật + Phân bón",
			subject: "Lúa",
			type: "DISEASE",
			symptom: "vết thoi",
			note: null,
			recommendedIngredients: ["Tricyclazole"],
			pinnedProductIds: ["p1"],
			excludedProductIds: [],
			isPinned: false,
			isActive: true,
			createdAt: "2026-07-23T00:00:00.000Z",
			updatedAt: "2026-07-23T00:00:00.000Z",
		};
		const d = toDisease(entry);
		expect(d.category).toBe("CROP_PROTECTION_AND_FERTILIZER");
		expect(d.type).toBe("disease");
		expect(d.recommendedIngredients).toEqual(["Tricyclazole"]);
		expect(d.pinnedProductIds).toEqual(["p1"]);
	});
});
