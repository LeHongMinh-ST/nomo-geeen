"use client";

import { SUPER_ADMIN_ROLE_CODE } from "@/lib/admin-rbac";
import { useAdminAuth } from "@/stores/admin-auth-store";

/**
 * R7.8: client-side permission check. SUPER_ADMIN shortcut (R4.2) — returns
 * true for any code when user has SUPER_ADMIN in roleCodes.
 */
export function useHasPermission(code: string): boolean {
	const admin = useAdminAuth((s) => s.admin);
	if (!admin) return false;
	const roleCodes =
		admin.roleCodes && admin.roleCodes.length > 0
			? admin.roleCodes
			: (admin.role ?? "")
					.split(",")
					.map((r) => r.trim())
					.filter(Boolean);
	if (roleCodes.includes(SUPER_ADMIN_ROLE_CODE)) return true;
	return admin.permissions?.includes(code) ?? false;
}
