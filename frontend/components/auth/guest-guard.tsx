"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { useUserAuth } from "@/stores/user-auth-store";

/**
 * Guard nguoc voi UserAuthGuard: chi cho KHACH (chua dang nhap) vao.
 * Da dang nhap -> day ve trang chu. Dung cho /dang-nhap, /dang-ky.
 */
export function GuestGuard({ children }: { children: ReactNode }) {
	const router = useRouter();
	const user = useUserAuth((state) => state.user);
	const hydrated = useUserAuth((state) => state.hasHydrated);
	const loading = useUserAuth((state) => state.loading);
	const hydrate = useUserAuth((state) => state.hydrate);

	useEffect(() => {
		void hydrate();
	}, [hydrate]);

	useEffect(() => {
		if (!hydrated || loading) return;
		if (user) {
			router.replace("/");
		}
	}, [hydrated, loading, router, user]);

	// Chua biet trang thai (dang hydrate lan dau), hoac da dang nhap (dang chuyen
	// huong) -> che man hinh de tranh nhay form dang nhap. KHONG gate theo
	// `loading`: khi submit login that bai, `loading` toggle true->false se
	// remount LoginForm va lam mat state loi (serverError). `!hydrated` da du
	// cho lan hydrate dau; sau do form phai o nguyen de hien thi loi tu server.
	if (!hydrated || user) {
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
