import { beforeEach, describe, expect, it, vi } from "vitest";
import { userFetch } from "@/lib/user-fetch";
import {
	getTenantHomeSummary,
	moneyNumber,
	revenueDelta,
} from "./tenant-dashboard-api";

vi.mock("@/lib/user-fetch", () => ({ userFetch: vi.fn() }));
const mocked = vi.mocked(userFetch);

describe("tenant dashboard api", () => {
	beforeEach(() => mocked.mockReset());

	it("loads home summary through the tenant reports route", () => {
		getTenantHomeSummary();
		expect(mocked).toHaveBeenCalledWith("/tenant/reports/home-summary");
	});

	it("computes revenue deltas without inventing growth", () => {
		expect(revenueDelta("120", "100")).toEqual({ text: "+20%", up: true });
		expect(revenueDelta("80", "100")).toEqual({ text: "-20%", up: false });
		expect(revenueDelta("0", "0")).toBeNull();
		expect(revenueDelta("50", "0")).toEqual({ text: "+100%", up: true });
	});

	it("parses money strings safely", () => {
		expect(moneyNumber("1500000")).toBe(1_500_000);
		expect(moneyNumber("bad")).toBe(0);
		expect(moneyNumber(undefined)).toBe(0);
	});
});
