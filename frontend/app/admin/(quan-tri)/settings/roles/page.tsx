"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useAdminAuth } from "@/stores/admin-auth-store";
import { RoleTable } from "@/components/admin/role-table";
import { useRolesManagement } from "@/components/admin/use-roles-management";

/**
 * Trang list vai tro (R7.5).
 * Settings hub (/admin/settings) link vao day. Co /[id] (detail) va /new
 * (create) la sibling. Pattern copy tu admin-users/page.tsx de giu dong nhat.
 */
export default function AdminRolesPage() {
	const router = useRouter();
	const allowed = useHasPermission("admin.role:view");
	const hasHydrated = useAdminAuth((s) => s.hasHydrated);
	const {
		roles,
		mobileItems,
		permissions,
		loading,
		error,
		handleCreate,
		handleUpdate,
		handleDelete,
	} = useRolesManagement();

	useEffect(() => {
		if (hasHydrated && !allowed) router.replace("/admin/forbidden");
	}, [hasHydrated, allowed, router]);

	if (!hasHydrated || !allowed) return null;

	return (
		<RoleTable
			roles={roles}
			mobileItems={mobileItems}
			permissions={permissions}
			loading={loading}
			error={error}
			onCreate={handleCreate}
			onUpdate={handleUpdate}
			onDelete={handleDelete}
		/>
	);
}
