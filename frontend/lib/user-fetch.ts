import { createUserApiError, type UserApiError } from "@/lib/user-auth-api";
import { useUserAuth } from "@/stores/user-auth-store";

type UserFetchInit = RequestInit & {
	accessToken?: string | null;
	_retried?: boolean;
};

const API_BASE =
	process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
	if (refreshPromise) return refreshPromise;
	refreshPromise = (async () => {
		try {
			const response = await fetch(`${API_BASE}/auth/refresh`, {
				method: "POST",
				credentials: "include",
			});
			if (!response.ok) return null;
			const body = (await response.json()) as { accessToken?: string };
			if (!body.accessToken) return null;
			useUserAuth.getState().setAccessToken(body.accessToken);
			return body.accessToken;
		} catch {
			return null;
		} finally {
			refreshPromise = null;
		}
	})();
	return refreshPromise;
}

export async function userFetch<T>(
	path: string,
	init: UserFetchInit = {},
): Promise<T> {
	const headers = new Headers(init.headers);
	const method = (init.method ?? "GET").toUpperCase();
	if (method !== "GET" && method !== "HEAD" && !headers.has("Content-Type")) {
		headers.set("Content-Type", "application/json");
	}
	const token = init.accessToken ?? useUserAuth.getState().accessToken;
	if (token) headers.set("Authorization", `Bearer ${token}`);
	const response = await fetch(`${API_BASE}${path}`, {
		...init,
		headers,
		credentials: "include",
	});

	if (response.status === 401 && !init._retried) {
		const next = await tryRefresh();
		if (next) {
			return userFetch<T>(path, { ...init, accessToken: next, _retried: true });
		}
		useUserAuth.getState().clear();
	}
	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as {
			reason?: string;
		} | null;
		throw createUserApiError(
			response.status,
			body ?? undefined,
		) as UserApiError;
	}
	if (response.status === 204) return undefined as T;
	return (await response.json()) as T;
}
