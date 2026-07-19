"use client";

import { ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useAdminAuth } from "@/stores/admin-auth-store";

export default function AdminSettingsPage() {
	const router = useRouter();
	const allowed = useHasPermission("admin.role:view");
	const hasHydrated = useAdminAuth((s) => s.hasHydrated);

	useEffect(() => {
		if (hasHydrated && !allowed) router.replace("/admin/forbidden");
	}, [hasHydrated, allowed, router]);

	if (!hasHydrated || !allowed) return null;

	return (
		<div className="space-y-6">
			{/* Breadcrumb ngắn giống WordPress admin / Laravel Nova. */}
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

			{/* Group: Phân quyền — hiện chỉ có 1 card Vai trò. Sau này thêm
			    card khác thì refactor thành component SettingsCard + map(). */}
			<section className="space-y-3">
				<h2 className="border-b border-border pb-2 text-base font-semibold text-foreground">
					Phân quyền
				</h2>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
				</div>
			</section>
		</div>
	);
}
