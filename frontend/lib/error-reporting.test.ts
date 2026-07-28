import { describe, expect, it, vi } from "vitest";
import { reportClientError } from "./error-reporting";

describe("reportClientError", () => {
	it("does not send anywhere when no production endpoint is configured", () => {
		const fetchSpy = vi.spyOn(globalThis, "fetch");
		reportClientError(new Error("offline"), { source: "test" });
		expect(fetchSpy).not.toHaveBeenCalled();
		fetchSpy.mockRestore();
	});
});
