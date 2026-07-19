"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useAdminAuth } from "@/stores/admin-auth-store";
import { useAdminUserDetail } from "@/components/admin/use-admin-user-detail";
import {
	AdminUserDetailEmpty,
	AdminUserDetailPanel,
} from "@/components/admin/admin-user-detail-panel";
import { ListSkeleton } from "@/components/app/shared/list-skeleton";

export default function AdminUserDetailPage() {
	const router = useRouter();
	const params = useParams<{ id: string }>();
	const id = params?.id ?? "";
	const allowed = useHasPermission("admin.user:view");
	const hasHydrated = useAdminAuth((s) => s.hasHydrated);
	const currentAdmin = useAdminAuth((s) => s.admin);
	const {
		admin,
		roles,
		loading,
		saving,
		error,
		handleUpdate,
		handleDeactivate,
		handleReactivate,
	} = useAdminUserDetail(id);

	useEffect(() => {
		if (hasHydrated && !allowed) router.replace("/admin/forbidden");
	}, [hasHydrated, allowed, router]);

	if (!hasHydrated || !allowed) return null;
	if (loading && !admin) return <ListSkeleton withToolbar={false} rows={6} />;
	if (!admin) return <AdminUserDetailEmpty />;

	const isSelf = admin.id === currentAdmin?.id;

	return (
		<AdminUserDetailPanel
			admin={admin}
			roles={roles}
			isSelf={isSelf}
			saving={saving}
			error={error}
			onUpdate={handleUpdate}
			onDeactivate={handleDeactivate}
			onReactivate={handleReactivate}
		/>
	);
}
