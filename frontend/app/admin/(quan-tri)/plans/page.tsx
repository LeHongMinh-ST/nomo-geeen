"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PlanCatalog } from "@/components/admin/plan-catalog";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useAdminAuth } from "@/stores/admin-auth-store";

export default function AdminPlansPage() {
	const router = useRouter();
	const allowed = useHasPermission("admin.plan:view");
	const hasHydrated = useAdminAuth((state) => state.hasHydrated);

	useEffect(() => {
		if (hasHydrated && !allowed) router.replace("/admin/forbidden");
	}, [allowed, hasHydrated, router]);

	if (!hasHydrated || !allowed) return null;
	return <PlanCatalog />;
}
