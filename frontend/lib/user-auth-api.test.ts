import { describe, expect, it, vi } from "vitest";
import { createUserApiError, getVietQrBanks } from "./user-auth-api";

describe("createUserApiError", () => {
	it("preserves NestJS message for field-level form mapping", () => {
		const error = createUserApiError(400, {
			message: "attrs.activeIngredient is required for PESTICIDE",
		});

		expect(error.message).toBe("Thông tin chưa hợp lệ, vui lòng kiểm tra lại.");
		expect(error.serverMessage).toBe(
			"attrs.activeIngredient is required for PESTICIDE",
		);
	});

	it("joins validation message arrays without leaking them into the user message", () => {
		const error = createUserApiError(400, {
			message: [
				"attrs.activeIngredient is required",
				"attrs.concentration is required",
			],
		});

		expect(error.serverMessage).toBe(
			"attrs.activeIngredient is required; attrs.concentration is required",
		);
		expect(error.message).not.toContain("attrs.activeIngredient");
	});
});

describe("getVietQrBanks", () => {
	it("normalizes VietQR bank data for the settings form", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						code: "00",
						data: [
							{
								id: 1,
								name: "Vietcombank",
								shortName: "VCB",
								code: "VCB",
								bin: "970436",
							},
						],
					}),
					{ status: 200 },
				),
			),
		);
		await expect(getVietQrBanks()).resolves.toEqual([
			{
				id: "1",
				name: "Vietcombank",
				shortName: "VCB",
				code: "VCB",
				bin: "970436",
			},
		]);
		vi.unstubAllGlobals();
	});
});
