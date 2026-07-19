"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { PlanEditor } from "@/components/admin/plan-editor";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useAdminAuth } from "@/stores/admin-auth-store";

export default function EditPlanPage() {
	const params = useParams<{ id: string }>();
	const router = useRouter();
	const allowed = useHasPermission("admin.plan:edit");
	const hasHydrated = useAdminAuth((state) => state.hasHydrated);

	useEffect(() => {
		if (hasHydrated && !allowed) router.replace("/admin/forbidden");
	}, [allowed, hasHydrated, router]);

	if (!hasHydrated || !allowed || !params.id) return null;
	return <PlanEditor planId={params.id} />;
}
