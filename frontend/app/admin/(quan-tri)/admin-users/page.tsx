"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminUserTable } from "@/components/admin/admin-user-table";
import {
	type AdminUserStatusFilter,
	useAdminUsersManagement,
} from "@/components/admin/use-admin-users-management";
import { useHasPermission } from "@/hooks/use-has-permission";
import { listRoles, type RolePublicShape } from "@/lib/admin-api/roles";
import { useAdminAuth } from "@/stores/admin-auth-store";

export default function AdminUsersPage() {
	const router = useRouter();
	const allowed = useHasPermission("admin.user:view");
	const hasHydrated = useAdminAuth((s) => s.hasHydrated);
	const users = useAdminUsersManagement();
	const accessToken = useAdminAuth((s) => s.accessToken);
	const [roles, setRoles] = useState<RolePublicShape[]>([]);

	useEffect(() => {
		if (hasHydrated && !allowed) router.replace("/admin/forbidden");
	}, [hasHydrated, allowed, router]);

	// Roles for Phase 2 detail route.
	useEffect(() => {
		if (!allowed || !accessToken) return;
		let cancelled = false;
		void (async () => {
			try {
				const rs = await listRoles(accessToken);
				if (!cancelled) setRoles(rs);
			} catch {
				// ignore — phase 2 detail sẽ tự fetch nếu cần
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [accessToken, allowed]);

	if (!hasHydrated || !allowed) return null;

	return (
		<AdminUserTable
			items={users.items}
			total={users.total}
			page={users.page}
			pageSize={users.pageSize}
			loading={users.loading}
			error={users.error}
			roles={roles}
			q={users.q}
			status={users.status as AdminUserStatusFilter}
			mobileItems={users.mobileItems}
			mobileTotal={users.mobileTotal}
			mobileLoading={users.mobileLoading}
			onFilter={users.applyFilters}
			onPageChange={users.changePage}
			onLoadMoreMobile={users.loadMoreMobile}
			onCreate={users.handleCreate}
			onUpdate={users.handleUpdate}
			onDeactivate={users.handleDeactivate}
			onReactivate={users.handleReactivate}
			onResetPassword={users.handleResetPassword}
		/>
	);
}
