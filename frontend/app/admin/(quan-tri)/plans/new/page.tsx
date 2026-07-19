"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PlanEditor } from "@/components/admin/plan-editor";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useAdminAuth } from "@/stores/admin-auth-store";

export default function NewPlanPage() {
	const router = useRouter();
	const allowed = useHasPermission("admin.plan:edit");
	const hasHydrated = useAdminAuth((state) => state.hasHydrated);

	useEffect(() => {
		if (hasHydrated && !allowed) router.replace("/admin/forbidden");
	}, [allowed, hasHydrated, router]);

	if (!hasHydrated || !allowed) return null;
	return <PlanEditor />;
}
