"use client";

import { KeyRound, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useAdminAuth } from "@/stores/admin-auth-store";

export default function AdminSettingsPage() {
	const router = useRouter();
	const canRoles = useHasPermission("admin.role:view");
	const canPermissions = useHasPermission("admin.permission:view");
	const hasHydrated = useAdminAuth((s) => s.hasHydrated);
	const allowed = canRoles || canPermissions;

	useEffect(() => {
		if (hasHydrated && !allowed) router.replace("/admin/forbidden");
	}, [hasHydrated, allowed, router]);

	if (!hasHydrated || !allowed) return null;

	return (
		<div className="space-y-6">
			<nav
				aria-label="Breadcrumb"
				className="flex items-center gap-1.5 text-xs text-muted-foreground"
			>
				<Link
					href="/admin"
					className="rounded-[6px] px-1.5 py-1 font-semibold uppercase tracking-wider transition-colors duration-150 hover:bg-soft hover:text-foreground"
				>
					Bảng điều khiển
				</Link>
				<span aria-hidden className="text-muted-foreground/50">
					/
				</span>
				<span className="rounded-[6px] px-1.5 py-1 font-semibold uppercase tracking-wider text-foreground">
					Thiết lập
				</span>
			</nav>

			<header className="space-y-1.5">
				<h1 className="text-[26px] font-bold tracking-tight text-foreground">
					Thiết lập
				</h1>
				<p className="text-sm text-muted-foreground">
					Cấu hình vận hành nền tảng. Mỗi thẻ bên dưới là 1 nhóm cài đặt.
				</p>
			</header>

			<section className="space-y-3">
				<h2 className="border-b border-border pb-2 text-base font-semibold text-foreground">
					Phân quyền
				</h2>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
					{canRoles ? (
						<Link
							href="/admin/settings/roles"
							className="group flex flex-col gap-3 rounded-[16px] border border-border bg-card p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:border-primary/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] active:scale-[0.99]"
						>
							<div className="flex items-center gap-3">
								<span
									className="flex size-12 shrink-0 items-center justify-center rounded-[12px]"
									style={{ backgroundColor: "#7e57c2" }}
								>
									<ShieldCheck className="size-5 text-white" aria-hidden />
								</span>
								<h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-primary">
									Vai trò
								</h3>
							</div>
							<p className="text-sm text-muted-foreground">
								Quản lý vai trò quản trị và tập quyền tương ứng.
							</p>
						</Link>
					) : null}
					{canPermissions ? (
						<Link
							href="/admin/settings/permissions"
							className="group flex flex-col gap-3 rounded-[16px] border border-border bg-card p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:border-primary/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] active:scale-[0.99]"
						>
							<div className="flex items-center gap-3">
								<span
									className="flex size-12 shrink-0 items-center justify-center rounded-[12px]"
									style={{ backgroundColor: "#8e24aa" }}
								>
									<KeyRound className="size-5 text-white" aria-hidden />
								</span>
								<h3 className="text-base font-semibold text-foreground transition-colors group-hover:text-primary">
									Quyền hệ thống
								</h3>
							</div>
							<p className="text-sm text-muted-foreground">
								Danh mục quyền admin.* chỉ đọc (R7.7).
							</p>
						</Link>
					) : null}
				</div>
			</section>
		</div>
	);
}
