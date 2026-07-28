"use client";
import {
	startAuthentication,
	startRegistration,
} from "@simplewebauthn/browser";

type RegistrationOptions = Parameters<
	typeof startRegistration
>[0]["optionsJSON"];
type AuthenticationOptions = Parameters<
	typeof startAuthentication
>[0]["optionsJSON"];
export type CachedPasskeyOptions = {
	challengeId: string;
	options: unknown;
	expiresAt: number;
};
export function isPasskeyCacheFresh(
	cached: Pick<CachedPasskeyOptions, "expiresAt"> | null,
	now = Date.now(),
) {
	return cached !== null && cached.expiresAt > now;
}
export function passkeySupported() {
	return (
		typeof window !== "undefined" &&
		!!window.isSecureContext &&
		!!window.PublicKeyCredential
	);
}
export async function canUsePasskey() {
	if (!passkeySupported()) return false;
	const check =
		window.PublicKeyCredential?.isUserVerifyingPlatformAuthenticatorAvailable;
	return (
		typeof check !== "function" ||
		(await check.call(window.PublicKeyCredential))
	);
}
export async function registerPasskey(options: unknown) {
	return startRegistration({ optionsJSON: options as RegistrationOptions });
}
export async function authenticatePasskey(options: unknown) {
	return startAuthentication({ optionsJSON: options as AuthenticationOptions });
}
