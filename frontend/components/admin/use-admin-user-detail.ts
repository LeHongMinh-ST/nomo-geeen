"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
	type AdminPublicShape,
	resetPassword as apiResetPassword,
	type CreateAdminInput,
	createAdmin,
	deactivateAdmin,
	getAdmin,
	reactivateAdmin,
	type UpdateAdminInput,
	updateAdmin,
} from "@/lib/admin-api/admin-users";
import type { RolePublicShape } from "@/lib/admin-api/roles";
import { listRoles } from "@/lib/admin-api/roles";
import { useAdminAuth } from "@/stores/admin-auth-store";

/**
 * Hook cho /admin/admin-users/[id] (detail + edit + deactivate/reactivate).
 */
export function useAdminUserDetail(id: string) {
	const accessToken = useAdminAuth((s) => s.accessToken);
	const [admin, setAdmin] = useState<AdminPublicShape | null>(null);
	const [roles, setRoles] = useState<RolePublicShape[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		if (!accessToken) return;
		setLoading(true);
		setError(null);
		try {
			const [a, rs] = await Promise.all([
				getAdmin(accessToken, id),
				listRoles(accessToken),
			]);
			setAdmin(a);
			setRoles(rs);
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setLoading(false);
		}
	}, [accessToken, id]);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const handleUpdate = useCallback(
		async (targetId: string, input: UpdateAdminInput) => {
			if (!accessToken) return;
			setSaving(true);
			try {
				const a = await updateAdmin(accessToken, targetId, input);
				setAdmin(a);
			} finally {
				setSaving(false);
			}
		},
		[accessToken],
	);

	const handleDeactivate = useCallback(async () => {
		if (!accessToken) return;
		setSaving(true);
		try {
			await deactivateAdmin(accessToken, id);
			await refresh();
		} finally {
			setSaving(false);
		}
	}, [accessToken, id, refresh]);

	const handleReactivate = useCallback(async () => {
		if (!accessToken) return;
		setSaving(true);
		try {
			await reactivateAdmin(accessToken, id);
			await refresh();
		} finally {
			setSaving(false);
		}
	}, [accessToken, id, refresh]);

	return {
		admin,
		roles,
		loading,
		saving,
		error,
		handleUpdate,
		handleDeactivate,
		handleReactivate,
	};
}

/**
 * Hook cho /admin/admin-users/new.
 */
export function useAdminUserCreate() {
	const accessToken = useAdminAuth((s) => s.accessToken);
	const router = useRouter();
	const [roles, setRoles] = useState<RolePublicShape[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!accessToken) return;
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const rs = await listRoles(accessToken);
				if (!cancelled) setRoles(rs);
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
		async (input: CreateAdminInput) => {
			if (!accessToken) return;
			setSaving(true);
			try {
				const a = await createAdmin(accessToken, input);
				router.push(`/admin/admin-users/${a.id}`);
			} finally {
				setSaving(false);
			}
		},
		[accessToken, router],
	);

	return { roles, loading, saving, error, handleCreate };
}

/**
 * Hook cho /admin/admin-users/[id]/reset-password.
 */
export function useAdminUserResetPassword(id: string) {
	const accessToken = useAdminAuth((s) => s.accessToken);
	const router = useRouter();
	const [admin, setAdmin] = useState<AdminPublicShape | null>(null);
	const [loading, setLoading] = useState(true);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!accessToken) return;
		let cancelled = false;
		(async () => {
			setLoading(true);
			try {
				const a = await getAdmin(accessToken, id);
				if (!cancelled) setAdmin(a);
			} catch (err) {
				if (!cancelled) setError((err as Error).message);
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [accessToken, id]);

	const handleSubmit = useCallback(
		async (newPassword: string) => {
			if (!accessToken) return;
			setSubmitting(true);
			try {
				await apiResetPassword(accessToken, id, newPassword);
				router.push(`/admin/admin-users/${id}`);
			} finally {
				setSubmitting(false);
			}
		},
		[accessToken, id, router],
	);

	return { admin, loading, submitting, error, handleSubmit };
}
