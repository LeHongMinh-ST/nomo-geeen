"use client";

import { useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useAdminAuth } from "@/stores/admin-auth-store";
import { useRoleDetail } from "@/components/admin/use-role-detail";
import {
	RoleDetailEmpty,
	RoleDetailPanel,
} from "@/components/admin/role-detail-panel";
import { ListSkeleton } from "@/components/app/shared/list-skeleton";

export default function AdminRoleDetailPage() {
	const router = useRouter();
	const params = useParams<{ id: string }>();
	const roleId = params?.id ?? "";
	const allowed = useHasPermission("admin.role:view");
	const hasHydrated = useAdminAuth((s) => s.hasHydrated);
	const {
		role,
		permissions,
		permissionsByResource,
		loading,
		saving,
		error,
		handleUpdate,
		handleDelete,
	} = useRoleDetail(roleId);

	useEffect(() => {
		if (hasHydrated && !allowed) router.replace("/admin/forbidden");
	}, [hasHydrated, allowed, router]);

	// Wrap 1-tham-so (hook) thanh 2-tham-so (panel) giong contract cu.
	const onUpdate = useCallback(
		async (id: string, input: Parameters<typeof handleUpdate>[0]) => {
			if (id !== roleId) return;
			await handleUpdate(input);
		},
		[handleUpdate, roleId],
	);

	if (!hasHydrated || !allowed) return null;
	if (loading && !role) return <ListSkeleton withToolbar={false} rows={6} />;
	if (!role) return <RoleDetailEmpty />;

	return (
		<RoleDetailPanel
			role={role}
			permissions={permissions}
			permissionsByResource={permissionsByResource}
			saving={saving}
			error={error}
			onUpdate={onUpdate}
			onDelete={handleDelete}
		/>
	);
}
