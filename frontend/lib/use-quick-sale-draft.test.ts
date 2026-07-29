import { describe, expect, it } from "vitest";
import { canApplyQuickSaleDraftResponse } from "./use-quick-sale-draft";

describe("quick-sale draft refresh guard", () => {
	it("rejects a response from a previous generation or draft", () => {
		expect(
			canApplyQuickSaleDraftResponse(
				"draft-new",
				3,
				"draft-old",
				2,
				"draft-old",
			),
		).toBe(false);
		expect(
			canApplyQuickSaleDraftResponse(
				"draft-new",
				3,
				"draft-new",
				2,
				"draft-new",
			),
		).toBe(false);
		expect(
			canApplyQuickSaleDraftResponse(
				"draft-new",
				3,
				"draft-new",
				3,
				"draft-old",
			),
		).toBe(false);
	});

	it("accepts only the current canonical snapshot", () => {
		expect(
			canApplyQuickSaleDraftResponse("draft-1", 4, "draft-1", 4, "draft-1"),
		).toBe(true);
	});
});
