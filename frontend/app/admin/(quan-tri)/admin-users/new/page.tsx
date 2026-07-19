"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useHasPermission } from "@/hooks/use-has-permission";
import { useAdminAuth } from "@/stores/admin-auth-store";
import { useAdminUserCreate } from "@/components/admin/use-admin-user-detail";
import { AdminUserEditorForm } from "@/components/admin/admin-user-editor-form";
import { ListSkeleton } from "@/components/app/shared/list-skeleton";

export default function AdminUserCreatePage() {
	const router = useRouter();
	const allowed = useHasPermission("admin.user:create");
	const hasHydrated = useAdminAuth((s) => s.hasHydrated);
	const { roles, loading, error, handleCreate } = useAdminUserCreate();

	useEffect(() => {
		if (hasHydrated && !allowed) router.replace("/admin/forbidden");
	}, [hasHydrated, allowed, router]);

	if (!hasHydrated || !allowed) return null;
	if (loading) return <ListSkeleton withToolbar={false} rows={6} />;

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-3">
				<Link
					href="/admin/admin-users"
					className="inline-flex size-11 items-center justify-center rounded-[10px] border border-border bg-card text-muted-foreground hover:bg-soft"
					aria-label="Quay lại danh sách"
				>
					<ArrowLeft className="size-4" aria-hidden />
				</Link>
				<div>
					<h1 className="text-[26px] font-bold tracking-tight">Tạo tài khoản</h1>
					<p className="mt-1 text-sm text-muted-foreground">
						Tạo tài khoản quản trị nội bộ mới và gán vai trò.
					</p>
				</div>
			</div>

			{error ? (
				<div
					role="alert"
					className="rounded-[10px] border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive"
				>
					Lỗi: {error}
				</div>
			) : null}

			<section className="rounded-[16px] border border-border bg-card p-4">
				<AdminUserEditorForm
					mode="create"
					roles={roles}
					onSubmit={handleCreate}
				/>
			</section>
		</div>
	);
}
