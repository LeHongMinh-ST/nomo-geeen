"use client";

import { useCallback, useEffect, useState } from "react";
import { useAdminAuth } from "@/stores/admin-auth-store";
import {
	type CreateRoleInput,
	type PermissionPublicShape,
	type RolePublicShape,
	type UpdateRoleInput,
	createRole,
	deleteRole,
	getRole,
	listPermissions,
	listRoles,
	updateRole,
} from "@/lib/admin-api/roles";
import { useRouter } from "next/navigation";

/**
 * Hook cho /admin/roles/[id] (detail + edit + delete).
 * Load role + permissions. Sau khi update/delete thanh cong, navigate ve list.
 */
export function useRoleDetail(roleId: string) {
	const accessToken = useAdminAuth((s) => s.accessToken);
	const router = useRouter();
	const [role, setRole] = useState<RolePublicShape | null>(null);
	const [permissions, setPermissions] = useState<PermissionPublicShape[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		if (!accessToken) return;
		setLoading(true);
		setError(null);
		try {
			const [r, ps] = await Promise.all([
				getRole(accessToken, roleId),
				listPermissions(accessToken),
			]);
			setRole(r);
			setPermissions(ps);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	}, [accessToken, roleId]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const handleUpdate = useCallback(
		async (input: UpdateRoleInput) => {
			if (!accessToken) return;
			setSaving(true);
			try {
				const r = await updateRole(accessToken, roleId, input);
				setRole(r);
			} finally {
				setSaving(false);
			}
		},
		[accessToken, roleId],
	);

	const handleDelete = useCallback(async () => {
		if (!accessToken) return;
		setSaving(true);
		try {
			await deleteRole(accessToken, roleId);
			router.push("/admin/settings");
		} finally {
			setSaving(false);
		}
	}, [accessToken, roleId, router]);

	const permissionsByResource = (() => {
		const map = new Map<string, PermissionPublicShape[]>();
		for (const p of permissions) {
			const arr = map.get(p.resource) ?? [];
			arr.push(p);
			map.set(p.resource, arr);
		}
		return map;
	})();

	return {
		role,
		permissions,
		permissionsByResource,
		loading,
		saving,
		error,
		handleUpdate,
		handleDelete,
	};
}

/**
 * Hook cho /admin/roles/new: chi can permissions (de chon quyen).
 * Sau khi create thanh cong, navigate ve detail.
 */
export function useRoleCreate() {
	const accessToken = useAdminAuth((s) => s.accessToken);
	const router = useRouter();
	const [permissions, setPermissions] = useState<PermissionPublicShape[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!accessToken) return;
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const ps = await listPermissions(accessToken);
				if (!cancelled) setPermissions(ps);
			} catch (err) {
				if (!cancelled) setError((err as Error).message);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [accessToken]);

	const handleCreate = useCallback(
		async (input: CreateRoleInput) => {
			if (!accessToken) return;
			setSaving(true);
			try {
				const r = await createRole(accessToken, input);
				router.push(`/admin/settings/roles/${r.id}`);
			} finally {
				setSaving(false);
			}
		},
		[accessToken, router],
	);

	const permissionsByResource = (() => {
		const map = new Map<string, PermissionPublicShape[]>();
		for (const p of permissions) {
			const arr = map.get(p.resource) ?? [];
			arr.push(p);
			map.set(p.resource, arr);
		}
		return map;
	})();

	// Reuse listRoles import to silence unused warning if any; not used in this hook.
	void listRoles;

	return {
		permissions,
		permissionsByResource,
		loading,
		saving,
		error,
		handleCreate,
	};
}
