"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TenantList } from "@/components/admin/tenant-list";
import { useTenantsManagement } from "@/components/admin/use-tenants-management";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useAdminAuth } from "@/stores/admin-auth-store";

export default function AdminTenantsPage() {
	const router = useRouter();
	const allowed = useHasPermission("admin.tenant:view");
	const hasHydrated = useAdminAuth((s) => s.hasHydrated);
	const tenants = useTenantsManagement();

	useEffect(() => {
		if (hasHydrated && !allowed) router.replace("/admin/forbidden");
	}, [hasHydrated, allowed, router]);

	if (!hasHydrated || !allowed) return null;

	return (
		<TenantList
			items={tenants.items}
			total={tenants.total}
			page={tenants.page}
			pageSize={tenants.pageSize}
			q={tenants.q}
			status={tenants.status}
			loading={tenants.loading}
			error={tenants.error}
			mobileItems={tenants.mobileItems}
			mobileTotal={tenants.mobileTotal}
			mobileLoading={tenants.loading}
			kpi={tenants.kpi}
			onLoadMoreMobile={tenants.loadMoreMobile}
			onFilter={tenants.applyFilters}
			onPageChange={tenants.changePage}
			onRefresh={() => tenants.refresh()}
			onExport={tenants.handleExport}
		/>
	);
}
