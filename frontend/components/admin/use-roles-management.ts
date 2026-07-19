"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "@/stores/admin-auth-store";
import {
	type CreateRoleInput,
	createRole,
	deleteRole,
	listPermissions,
	listRoles,
	type PermissionPublicShape,
	type RolePublicShape,
	type UpdateRoleInput,
	updateRole,
} from "@/lib/admin-api/roles";

/**
 * Hook cho /admin/roles: load roles + permissions, expose CRUD ops.
 * `listRoles` API tra toan bo (khong phan trang - so role nho) nen khong can
 * accumulator rieng cho mobile. Mobile card-list va desktop table cung
 * render tu cung mot mang `roles`.
 */
export function useRolesManagement() {
	const accessToken = useAdminAuth((s) => s.accessToken);
	const [roles, setRoles] = useState<RolePublicShape[]>([]);
	const [permissions, setPermissions] = useState<PermissionPublicShape[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		if (!accessToken) return;
		setLoading(true);
		setError(null);
		try {
			const [rs, ps] = await Promise.all([
				listRoles(accessToken),
				listPermissions(accessToken),
			]);
			setRoles(rs);
			setPermissions(ps);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	}, [accessToken]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const handleCreate = useCallback(
		async (input: CreateRoleInput) => {
			if (!accessToken) return;
			await createRole(accessToken, input);
			await refresh();
		},
		[accessToken, refresh],
	);

	const handleUpdate = useCallback(
		async (roleId: string, input: UpdateRoleInput) => {
			if (!accessToken) return;
			await updateRole(accessToken, roleId, input);
			await refresh();
		},
		[accessToken, refresh],
	);

	// Khong goi window.confirm o day - component se dam nhiem inline 2-step
	// confirm theo DESIGN.md §21.
	const handleDelete = useCallback(
		async (roleId: string) => {
			if (!accessToken) return;
			// Optimistic UI: remove row, restore on failure.
			const previous = roles;
			setRoles((rs) => rs.filter((r) => r.id !== roleId));
			try {
				await deleteRole(accessToken, roleId);
			} catch (err) {
				setRoles(previous);
				throw err;
			}
		},
		[accessToken, roles],
	);

	return {
		roles,
		// mobileItems giong roles; truyen rieng de giu prop API tuong thich
		// voi AdminUserList/ TenantList (cung pattern list/detail).
		mobileItems: roles,
		permissions,
		loading,
		error,
		refresh,
		handleCreate,
		handleUpdate,
		handleDelete,
	};
}
