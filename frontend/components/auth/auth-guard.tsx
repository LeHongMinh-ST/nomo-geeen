"use client";

import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { useEffect, type ReactNode } from "react";
import { useAdminAuth } from "@/stores/admin-auth-store";

/**
 * Pattern giong stem-exam-app: 1 component guard, hydrate qua /auth/me
 * khi mount, redirect login neu fail. KHONG persist gi vao sessionStorage
 * de tranh stale data (admin cu thieu roleCodes/permissions).
 */

export function AuthGuard({ children }: { children: ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const admin = useAdminAuth((s) => s.admin);
	const hydrated = useAdminAuth((s) => s.hasHydrated);
	const loading = useAdminAuth((s) => s.loading);
	const hydrate = useAdminAuth((s) => s.hydrate);

	const isAuthenticated = !!admin;

	// Hydrate 1 lan khi mount.
	useEffect(() => {
		void hydrate();
	}, [hydrate]);

	useEffect(() => {
		if (!hydrated || loading) return;
		if (!isAuthenticated) {
			router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
		}
	}, [hydrated, loading, isAuthenticated, pathname, router]);

	if (!hydrated || loading) {
		return <BootScreen />;
	}
	if (!isAuthenticated) {
		return null;
	}
	return <>{children}</>;
}

function BootScreen() {
	return (
		<div
			className="flex min-h-[100dvh] w-full items-center justify-center bg-background"
			aria-busy="true"
			aria-live="polite"
		>
			<div className="flex flex-col items-center gap-5 text-[#9e9e9e]">
				<Image
					src="/images/logo.png"
					alt="NomoGreen"
					width={192}
					height={64}
					priority
					className="h-16 w-auto animate-pulse object-contain"
				/>
				<span className="text-sm">Đang tải...</span>
			</div>
		</div>
	);
}
