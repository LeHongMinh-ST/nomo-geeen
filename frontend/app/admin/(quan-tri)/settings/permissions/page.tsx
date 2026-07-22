"use client";

import { KeyRound, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PermissionGroupCard } from "@/components/admin/permission-group-card";
import { ListSkeleton } from "@/components/app/shared/list-skeleton";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
	listPermissions,
	type PermissionPublicShape,
} from "@/lib/admin-api/roles";
import { useAdminAuth } from "@/stores/admin-auth-store";

/**
 * R7.7 — read-only permission catalog (`/admin/settings/permissions`).
 * Groups admin.* codes by resource; no mutation controls.
 */
export default function AdminPermissionsCatalogPage() {
	const router = useRouter();
	const allowed = useHasPermission("admin.permission:view");
	const hasHydrated = useAdminAuth((s) => s.hasHydrated);
	const accessToken = useAdminAuth((s) => s.accessToken);
	const [permissions, setPermissions] = useState<PermissionPublicShape[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [filter, setFilter] = useState("");

	useEffect(() => {
		if (hasHydrated && !allowed) router.replace("/admin/forbidden");
	}, [hasHydrated, allowed, router]);

	useEffect(() => {
		if (!accessToken || !allowed) return;
		let cancelled = false;
		setLoading(true);
		setError(null);
		void listPermissions(accessToken)
			.then((rows) => {
				if (!cancelled) setPermissions(rows);
			})
			.catch((err) => {
				if (!cancelled) setError((err as Error).message);
			})
			.finally(() => {
				if (!cancelled) setLoading(false);
			});
		return () => {
			cancelled = true;
		};
	}, [accessToken, allowed]);

	const byResource = useMemo(() => {
		const map = new Map<string, PermissionPublicShape[]>();
		for (const p of permissions) {
			const key = p.resource || "other";
			const list = map.get(key) ?? [];
			list.push(p);
			map.set(key, list);
		}
		return new Map([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
	}, [permissions]);

	const selectedIds = useMemo(
		() => new Set(permissions.map((p) => p.id)),
		[permissions],
	);

	if (!hasHydrated || !allowed) return null;
	if (loading) return <ListSkeleton withToolbar={false} rows={6} />;

	return (
		<div className="space-y-6">
			<nav
				aria-label="Breadcrumb"
				className="flex items-center gap-1.5 text-xs text-muted-foreground"
			>
				<Link
					href="/admin/settings"
					className="rounded-[6px] px-1.5 py-1 font-semibold uppercase tracking-wider transition-colors duration-150 hover:bg-soft hover:text-foreground"
				>
					Thiết lập
				</Link>
				<span aria-hidden className="text-muted-foreground/50">
					/
				</span>
				<span className="rounded-[6px] px-1.5 py-1 font-semibold uppercase tracking-wider text-foreground">
					Quyền hệ thống
				</span>
			</nav>

			<header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
				<div className="space-y-1.5">
					<div className="flex items-center gap-2">
						<span className="flex size-10 items-center justify-center rounded-[12px] bg-violet-600 text-white">
							<KeyRound className="size-5" aria-hidden />
						</span>
						<h1 className="text-[26px] font-bold tracking-tight text-foreground">
							Quyền hệ thống
						</h1>
					</div>
					<p className="text-sm text-muted-foreground">
						Danh mục quyền admin.* (chỉ đọc). Gán quyền qua vai trò.
					</p>
				</div>
				<label className="relative flex h-10 w-full items-center sm:w-72">
					<Search
						className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground"
						aria-hidden
					/>
					<input
						type="search"
						value={filter}
						onChange={(e) => setFilter(e.target.value)}
						placeholder="Lọc mã, nhãn, hành động..."
						className="h-10 w-full rounded-[10px] border border-border bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
					/>
				</label>
			</header>

			{error ? (
				<div
					role="alert"
					className="rounded-[10px] border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive"
				>
					{error}
				</div>
			) : null}

			<p className="text-sm text-muted-foreground">
				Tổng{" "}
				<span className="font-semibold tabular-nums text-foreground">
					{permissions.length}
				</span>{" "}
				quyền · {byResource.size} nhóm resource
			</p>

			<div className="flex flex-col gap-3">
				{[...byResource.entries()].map(([resource, perms]) => (
					<PermissionGroupCard
						key={resource}
						resource={resource}
						permissions={perms}
						selectedIds={selectedIds}
						filter={filter}
						readOnly
						onToggle={() => undefined}
						onToggleAll={() => undefined}
					/>
				))}
			</div>
		</div>
	);
}
