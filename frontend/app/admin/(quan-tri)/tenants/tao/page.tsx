"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CreateTenantForm } from "@/components/admin/create-tenant-form";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useAdminAuth } from "@/stores/admin-auth-store";
export default function CreateTenantPage() {
	const router = useRouter();
	const allowed = useHasPermission("admin.tenant:create");
	const hasHydrated = useAdminAuth((state) => state.hasHydrated);
	useEffect(() => {
		if (hasHydrated && !allowed) router.replace("/admin/forbidden");
	}, [allowed, hasHydrated, router]);
	if (!hasHydrated || !allowed) return null;
	return <CreateTenantForm />;
}
