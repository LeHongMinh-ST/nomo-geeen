import { describe, expect, it } from "vitest";
import { collectSaleAdvisories } from "./sale-advisories-strip";

describe("collectSaleAdvisories", () => {
	it("returns empty when source missing or empty", () => {
		expect(collectSaleAdvisories(null)).toEqual([]);
		expect(collectSaleAdvisories({})).toEqual([]);
		expect(collectSaleAdvisories({ agro: {} })).toEqual([]);
	});

	it("reads phi/rei from agro and line fields", () => {
		expect(
			collectSaleAdvisories({ agro: { phi: 7, rei: 24 } }).map((c) => c.label),
		).toEqual(["PHI 7 ngày", "REI 24 giờ"]);
		expect(
			collectSaleAdvisories({ phiDays: 14, reiHours: 48 }).map((c) => c.label),
		).toEqual(["PHI 14 ngày", "REI 48 giờ"]);
	});

	it("ignores zero/negative/non-finite", () => {
		expect(collectSaleAdvisories({ phiDays: 0, reiHours: -1 })).toEqual([]);
	});

	it("reads withdrawal from attrs", () => {
		const chips = collectSaleAdvisories({
			attrs: { withdrawalNote: "Cách ly 3 ngày sau phun" },
		});
		expect(chips).toEqual([
			{ key: "withdrawal", label: "Cách ly 3 ngày sau phun" },
		]);
	});
});
