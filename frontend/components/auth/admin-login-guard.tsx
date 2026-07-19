"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useAdminAuth } from "@/stores/admin-auth-store";

export function AdminLoginGuard({ children }: { children: ReactNode }) {
	const router = useRouter();
	const admin = useAdminAuth((state) => state.admin);
	const hydrated = useAdminAuth((state) => state.hasHydrated);
	const loading = useAdminAuth((state) => state.loading);
	const hydrate = useAdminAuth((state) => state.hydrate);

	useEffect(() => {
		void hydrate();
	}, [hydrate]);

	useEffect(() => {
		if (hydrated && !loading && admin) {
			router.replace("/admin");
		}
	}, [admin, hydrated, loading, router]);

	if (!hydrated || loading || admin) return null;

	return <>{children}</>;
}
