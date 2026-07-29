import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "./format";

describe("formatDate", () => {
	it("formats ISO date-time without leaking the time portion", () => {
		expect(formatDate("2026-07-29T13:17:36.843Z")).toBe("29/07/2026");
	});

	it("formats date-only values", () => {
		expect(formatDate("2026-07-29")).toBe("29/07/2026");
	});

	it("keeps invalid values visible for diagnosis", () => {
		expect(formatDate("not-a-date")).toBe("not-a-date");
	});
});

describe("formatDateTime", () => {
	it("uses the shared Vietnamese date-time format", () => {
		expect(formatDateTime("2026-07-29T13:17:36.843Z")).toMatch(
			/^29\/07\/2026 \d{2}:\d{2}$/,
		);
	});
});
