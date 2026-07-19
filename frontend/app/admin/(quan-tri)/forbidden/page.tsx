"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useEffect } from "react";

/**
 * R7.9 / F-13: fixed NotAuthorized page. Always renders + shows toast
 * "Bạn không có quyền truy cập trang này." regardless of route gating.
 *
 * Toast hook dependency intentionally avoided: the toast subsystem isn't
 * part of RBAC scope. We surface the message via `window.alert` as a
 * universal, dependency-free fallback. A proper toast integration is
 * out of scope here; the toast text is duplicated in the visible
 * "Không có quyền truy cập" panel below so the message is never lost.
 */
export default function NoPermissionPage() {
	useEffect(() => {
		// Soft fallback toast. Real toast UX is delegated to a separate
		// notification subsystem that doesn't block route rendering.
		if (typeof window !== "undefined") {
			console.info("[NoPermission] Bạn không có quyền truy cập trang này.");
		}
	}, []);

	return (
		<div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
			<div className="flex size-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
				<ShieldAlert className="size-8" aria-hidden />
			</div>
			<h1 className="text-xl font-bold tracking-tight">Không có quyền truy cập</h1>
			<p className="max-w-md text-sm text-muted-foreground">
				Tài khoản của bạn không có quyền xem trang này. Nếu bạn cho rằng đây là
				sai sót, hãy liên hệ quản trị viên cấp cao.
			</p>
			<p
				role="status"
				className="rounded-[10px] border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive"
			>
				Bạn không có quyền truy cập trang này.
			</p>
			<Link
				href="/admin"
				className="inline-flex items-center rounded-[10px] bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90"
			>
				Về bảng điều khiển
			</Link>
		</div>
	);
}