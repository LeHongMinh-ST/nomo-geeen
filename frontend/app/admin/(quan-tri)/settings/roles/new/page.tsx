"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useAdminAuth } from "@/stores/admin-auth-store";
import { useRoleCreate } from "@/components/admin/use-role-detail";
import { RoleEditorForm } from "@/components/admin/role-editor-form";
import { ListSkeleton } from "@/components/app/shared/list-skeleton";

export default function AdminRoleCreatePage() {
	const router = useRouter();
	const allowed = useHasPermission("admin.role:create");
	const hasHydrated = useAdminAuth((s) => s.hasHydrated);
	const { permissions, permissionsByResource, loading, error, handleCreate } =
		useRoleCreate();

	useEffect(() => {
		if (hasHydrated && !allowed) router.replace("/admin/forbidden");
	}, [hasHydrated, allowed, router]);

	if (!hasHydrated || !allowed) return null;
	if (loading) return <ListSkeleton withToolbar={false} rows={6} />;

	return (
		<div className="flex flex-col gap-6">
			{/* Breadcrumb + heading gọn, action dính bên phải */}
			<div className="flex flex-col gap-3">
				<nav
					aria-label="Breadcrumb"
					className="flex items-center gap-1.5 text-xs text-muted-foreground"
				>
					<Link
						href="/admin/settings"
						className="inline-flex items-center gap-1 rounded-[6px] px-1.5 py-1 transition-colors duration-150 hover:bg-soft hover:text-foreground"
					>
						<ChevronLeft className="size-3" aria-hidden />
						Thiết lập
					</Link>
					<span aria-hidden className="text-muted-foreground/50">
						/
					</span>
					<span className="text-foreground">Tạo mới</span>
				</nav>
				<header className="space-y-1.5">
					<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
						Hệ thống · Thiết lập · Vai trò
					</p>
					<h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground">
						Tạo vai trò mới
					</h1>
					<p className="text-sm text-muted-foreground">
						Đặt mã định danh, tên hiển thị và tập quyền cho vai trò.
					</p>
				</header>
			</div>

			{error ? (
				<div
					role="alert"
					className="rounded-[10px] border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive"
				>
					Lỗi: {error}
				</div>
			) : null}

			<RoleEditorForm
				mode="create"
				permissions={permissions}
				permissionsByResource={permissionsByResource}
				onSubmit={handleCreate}
			/>
		</div>
	);
}
