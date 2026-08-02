import { describe, expect, it } from "vitest";
import { resolveRegulatoryField } from "./sale-regulatory-date-field";

describe("resolveRegulatoryField", () => {
	it("asks for harvest date on pesticide lines", () => {
		expect(resolveRegulatoryField("PESTICIDE")?.name).toBe("harvestDate");
	});

	it("asks for withdrawal end date on veterinary drug lines", () => {
		expect(resolveRegulatoryField("VET_DRUG")?.name).toBe("withdrawalEndDate");
	});

	it("stays silent for other kinds", () => {
		expect(resolveRegulatoryField("FERTILIZER")).toBeUndefined();
		expect(resolveRegulatoryField(null)).toBeUndefined();
		expect(resolveRegulatoryField(undefined)).toBeUndefined();
	});
});
