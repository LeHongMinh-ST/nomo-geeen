// Server-side guard cho khu vuc quan tri.
// Verify admin bang cach goi POST /auth/refresh (forward cookie HttpOnly)
// de lay access token moi, roi GET /auth/me de xac nhan admin con active.
// Neu bat ky buoc nao that bai -> return null (layout se redirect login).

import "server-only";
import { headers } from "next/headers";
import { SUPER_ADMIN_ROLE_CODE } from "@/lib/admin-rbac";

const API_BASE =
	process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
const REFRESH_COOKIE = "nomo_admin_rt";

export type AdminSession = {
	accessToken: string;
	admin: {
		id: string;
		email: string;
		fullName: string;
		role: string;
		roleCodes?: string[];
		permissions?: string[];
	};
};

async function readCookieHeader(): Promise<string | null> {
	const store = await headers();
	const cookie = store.get("cookie");
	return cookie ?? null;
}

/**
 * Verify admin session tu refresh cookie. Tra ve session neu hop le,
 * null neu khong (chua dang nhap / refresh het han / admin disabled).
 *
 * R5.1/R7.8: also returns `roleCodes` + `permissions` from `/auth/me` so the
 * client guard + nav filter can use the same source of truth.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
	const cookieHeader = await readCookieHeader();
	if (!cookieHeader?.includes(`${REFRESH_COOKIE}=`)) {
		return null;
	}

	// Buoc 1: refresh de lay access token moi + rotate cookie.
	const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
		method: "POST",
		headers: {
			Cookie: cookieHeader,
		},
		cache: "no-store",
	});
	if (!refreshRes.ok) {
		return null;
	}

	const refreshJson = (await refreshRes.json()) as { accessToken?: string };
	if (!refreshJson.accessToken) {
		return null;
	}

	// Buoc 2: xac nhan admin con hoat dong qua /auth/me.
	const meRes = await fetch(`${API_BASE}/auth/me`, {
		headers: {
			Authorization: `Bearer ${refreshJson.accessToken}`,
		},
		cache: "no-store",
	});
	if (!meRes.ok) {
		return null;
	}

	const admin = (await meRes.json()) as AdminSession["admin"];
	return { accessToken: refreshJson.accessToken, admin };
}

/**
 * R7.9 / F-13: client-side permission guard helper. If the admin lacks
 * the required permission, the calling page should redirect to the fixed
 * `/admin/forbidden` route (NOT `/admin`).
 */
export function lacksPermission(
	admin: AdminSession["admin"] | null,
	required: string,
): boolean {
	if (!admin) return true;
	if (admin.roleCodes?.includes(SUPER_ADMIN_ROLE_CODE)) return false;
	return !(admin.permissions ?? []).includes(required);
}
