"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useUserAuth } from "@/stores/user-auth-store";

export function UserAuthGuard({ children }: { children: ReactNode }) {
	const router = useRouter();
	const pathname = usePathname();
	const user = useUserAuth((state) => state.user);
	const hydrated = useUserAuth((state) => state.hasHydrated);
	const loading = useUserAuth((state) => state.loading);
	const hydrate = useUserAuth((state) => state.hydrate);
	const passwordRoute = pathname === "/doi-mat-khau";

	useEffect(() => {
		void hydrate();
	}, [hydrate]);

	useEffect(() => {
		if (!hydrated || loading) return;
		if (!user) {
			router.replace(`/dang-nhap?next=${encodeURIComponent(pathname)}`);
		} else if (user.mustChangePassword && !passwordRoute) {
			router.replace("/doi-mat-khau");
		}
	}, [hydrated, loading, passwordRoute, pathname, router, user]);

	if (
		!hydrated ||
		loading ||
		!user ||
		(user.mustChangePassword && !passwordRoute)
	) {
		return <BootScreen />;
	}
	return <>{children}</>;
}

function BootScreen() {
	return (
		<div
			className="flex min-h-[100dvh] items-center justify-center bg-background"
			aria-busy="true"
		>
			<div className="flex flex-col items-center gap-4 text-muted-foreground">
				<Image
					src="/images/logo.png"
					alt="NomoGreen"
					width={160}
					height={54}
					priority
					className="h-12 w-auto animate-pulse"
				/>
				<span className="text-sm">Đang tải phiên làm việc...</span>
			</div>
		</div>
	);
}
