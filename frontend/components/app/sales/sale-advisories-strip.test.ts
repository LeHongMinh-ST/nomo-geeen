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
			collectSaleAdvisories({ agro: { phi: 7, rei: 1 } }).map((c) => c.label),
		).toEqual(["PHI 7 ngày", "REI 1 ngày"]);
		expect(
			collectSaleAdvisories({ phiDays: 14, reiDays: 2 }).map((c) => c.label),
		).toEqual(["PHI 14 ngày", "REI 2 ngày"]);
	});

	it("reads phi/rei snake_case attrs", () => {
		expect(
			collectSaleAdvisories({ attrs: { phi_days: 5, rei_days: 2 } }).map(
				(c) => c.label,
			),
		).toEqual(["PHI 5 ngày", "REI 2 ngày"]);
	});

	it("ignores zero/negative/non-finite", () => {
		expect(collectSaleAdvisories({ phiDays: 0, reiDays: -1 })).toEqual([]);
	});

	it("renders one chip per veterinary withdrawal period", () => {
		expect(
			collectSaleAdvisories({
				attrs: {
					withdrawalMeatDays: 7,
					withdrawalMilkDays: 3,
					withdrawalEggDays: 5,
				},
			}),
		).toEqual([
			{ key: "withdrawalMeat", label: "Cách ly thịt 7 ngày" },
			{ key: "withdrawalMilk", label: "Cách ly sữa 3 ngày" },
			{ key: "withdrawalEgg", label: "Cách ly trứng 5 ngày" },
		]);
	});

	it("accepts snake_case withdrawal aliases and skips zero periods", () => {
		expect(
			collectSaleAdvisories({
				attrs: { withdrawal_meat_days: 4, withdrawal_milk_days: 0 },
			}),
		).toEqual([{ key: "withdrawalMeat", label: "Cách ly thịt 4 ngày" }]);
	});
});
