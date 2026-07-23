import { describe, expect, it } from "vitest";
import { createUserApiError } from "./user-auth-api";

describe("createUserApiError", () => {
	it("preserves NestJS message for field-level form mapping", () => {
		const error = createUserApiError(400, {
			message: "attrs.activeIngredient is required for PESTICIDE",
		});

		expect(error.message).toBe("Thông tin chưa hợp lệ, vui lòng kiểm tra lại.");
		expect(error.serverMessage).toBe("attrs.activeIngredient is required for PESTICIDE");
	});

	it("joins validation message arrays without leaking them into the user message", () => {
		const error = createUserApiError(400, {
			message: ["attrs.activeIngredient is required", "attrs.concentration is required"],
		});

		expect(error.serverMessage).toBe(
			"attrs.activeIngredient is required; attrs.concentration is required",
		);
		expect(error.message).not.toContain("attrs.activeIngredient");
	});
});
