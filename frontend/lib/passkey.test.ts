import { describe, expect, it, vi } from "vitest";

vi.mock("@simplewebauthn/browser", () => ({
	startAuthentication: vi.fn(async ({ optionsJSON }) => optionsJSON),
	startRegistration: vi.fn(async ({ optionsJSON }) => optionsJSON),
}));

import {
	authenticatePasskey,
	isPasskeyCacheFresh,
	passkeySupported,
	registerPasskey,
} from "./passkey";

describe("passkey browser boundary", () => {
	it("reports unsupported browser without PublicKeyCredential", () => {
		const original = window.PublicKeyCredential;
		Object.defineProperty(window, "PublicKeyCredential", {
			value: undefined,
			configurable: true,
		});
		expect(passkeySupported()).toBe(false);
		Object.defineProperty(window, "PublicKeyCredential", {
			value: original,
			configurable: true,
		});
	});
	it("keeps browser calls behind explicit wrappers", async () => {
		await expect(registerPasskey({ challenge: "r" })).resolves.toEqual({
			challenge: "r",
		});
		await expect(authenticatePasskey({ challenge: "a" })).resolves.toEqual({
			challenge: "a",
		});
	});
	it("rejects expired cached options before ceremony", () => {
		expect(isPasskeyCacheFresh({ expiresAt: 1000 }, 1000)).toBe(false);
		expect(isPasskeyCacheFresh({ expiresAt: 1001 }, 1000)).toBe(true);
	});
});
