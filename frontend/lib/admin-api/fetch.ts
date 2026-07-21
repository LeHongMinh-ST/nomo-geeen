// Shared admin API fetch: Bearer + silent 401 re-refresh once + retry.
// Pattern giong stem-exam-app: 1 global refresh promise de dedupe, retry
// request 1 lan sau khi refresh OK. Khong co bootstrap dance rieng.

import { useAdminAuth } from "@/stores/admin-auth-store";

const API_BASE =
	process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

type AdminFetchInit = RequestInit & {
	accessToken?: string | null;
	_retried?: boolean;
};

let refreshPromise: Promise<string | null> | null = null;

async function tryRefresh(): Promise<string | null> {
	if (refreshPromise) return refreshPromise;
	refreshPromise = (async () => {
		try {
			const res = await fetch(`${API_BASE}/auth/refresh?realm=admin`, {
				method: "POST",
				credentials: "include",
			});
			if (!res.ok) return null;
			const json = (await res.json()) as { accessToken?: string };
			if (!json.accessToken) return null;
			// Cap nhat accessToken vao store de cac request sau dung.
			useAdminAuth.getState().setAccessToken(json.accessToken);
			return json.accessToken;
		} catch {
			return null;
		} finally {
			refreshPromise = null;
		}
	})();
	return refreshPromise;
}

export async function adminFetch<T>(
	path: string,
	init: AdminFetchInit = {},
): Promise<T> {
	const headers = new Headers(init.headers);
	const isForm = init.body instanceof FormData;
	const method = (init.method ?? "GET").toUpperCase();
	if (!isForm && method !== "GET" && method !== "HEAD") {
		if (!headers.has("Content-Type")) {
			headers.set("Content-Type", "application/json");
		}
	}

	const token =
		init.accessToken ?? useAdminAuth.getState().accessToken ?? undefined;
	if (token) {
		headers.set("Authorization", `Bearer ${token}`);
	}

	const res = await fetch(`${API_BASE}${path}`, {
		...init,
		headers,
		credentials: "include",
	});

	if ((res.status === 401 || res.status === 403) && !init._retried) {
		// 401 = access expired/revoked. 403 = permission stale.
		// Thu refresh 1 lan, neu OK retry.
		const next = await tryRefresh();
		if (next) {
			return adminFetch<T>(path, {
				...init,
				accessToken: next,
				_retried: true,
			});
		}
		// Refresh that bai -> clear session, caller se throw.
		await useAdminAuth.getState().logout();
	}

	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as
			| { reason?: string; message?: string }
			| null;
		const message = body?.message ?? `HTTP ${res.status}`;
		throw Object.assign(new Error(message), {
			status: res.status,
			reason: body?.reason,
		});
	}

	if (res.status === 204) return undefined as unknown as T;

	const ct = res.headers.get("content-type") ?? "";
	if (ct.includes("text/csv") || ct.includes("application/octet-stream")) {
		return (await res.text()) as unknown as T;
	}
	return (await res.json()) as T;
}
