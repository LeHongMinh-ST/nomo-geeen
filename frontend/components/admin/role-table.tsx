"use client";

import { KeyRound, Plus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DataPagination } from "@/components/app/shared/data-pagination";
import { ListSkeleton } from "@/components/app/shared/list-skeleton";
import type {
	PermissionPublicShape,
	RolePublicShape,
} from "@/lib/admin-api/roles";
import { cn } from "@/lib/utils";
import { Can } from "./can-permission";
import { RoleKpiStrip } from "./role-kpi-strip";
import {
	InlineDeleteConfirm,
	RoleActionsMenu,
	RoleCard,
	RoleEmptyState,
	ScopeBadge,
} from "./role-row-extras";
import { RoleToolbar, type ScopeFilter, type SortKey } from "./role-toolbar";

const PAGE_SIZE = 10;

const SYSTEM_BADGE = "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80";

interface Props {
	roles: RolePublicShape[];
	mobileItems: RolePublicShape[];
	permissions: PermissionPublicShape[];
	loading: boolean;
	error: string | null;
	onCreate: (input: {
		code: string;
		name: string;
		permissionIds: string[];
	}) => Promise<void>;
	onUpdate: (
		roleId: string,
		input: {
			name?: string;
			addPermissionIds?: string[];
			removePermissionIds?: string[];
		},
	) => Promise<void>;
	onDelete: (roleId: string) => Promise<void>;
}

/**
 * Danh sách vai trò (R7.5) - editorial dashboard.
 * - Mobile/tablet: card list (RoleCard).
 * - Desktop: bảng hairline, KPI strip, toolbar search/filter/sort.
 * - Action gom vào RoleActionsMenu.
 * - Xoá: inline 2-step confirm (DESIGN.md §21).
 */
export function RoleTable({
	roles,
	mobileItems,
	permissions,
	loading,
	error,
	onCreate,
	onUpdate,
	onDelete,
}: Props) {
	void permissions;
	void onCreate;
	void onUpdate;

	const [page, setPage] = useState(1);
	const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);

	const [query, setQuery] = useState("");
	const [scope, setScope] = useState<ScopeFilter>("all");
	const [sort, setSort] = useState<SortKey>("newest");

	// Lắng nghe event mở inline confirm từ menu ⋮
	useEffect(() => {
		function onRequest(e: Event) {
			const detail = (e as CustomEvent<{ id: string }>).detail;
			if (detail?.id) setPendingDeleteId(detail.id);
		}
		window.addEventListener("role:request-delete", onRequest);
		return () => window.removeEventListener("role:request-delete", onRequest);
	}, []);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		const matched = roles.filter((role) => {
			if (scope === "system" && !role.isSystem) return false;
			if (scope === "custom" && role.isSystem) return false;
			if (!q) return true;
			return (
				role.name.toLowerCase().includes(q) ||
				role.code.toLowerCase().includes(q)
			);
		});
		const sorted = [...matched];
		sorted.sort((a, b) => {
			if (sort === "name") return a.name.localeCompare(b.name, "vi");
			if (sort === "permissions")
				return b.permissions.length - a.permissions.length;
			return (
				new Date(b.updatedAt ?? b.createdAt).getTime() -
				new Date(a.updatedAt ?? a.createdAt).getTime()
			);
		});
		return sorted;
	}, [roles, query, scope, sort]);

	// Filter changes reset pagination; the values are intentionally dependencies.
	// biome-ignore lint/correctness/useExhaustiveDependencies: filter changes reset pagination
	useEffect(() => {
		setPage(1);
	}, [query, scope, sort]);

	const total = filtered.length;
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const paged = useMemo(() => {
		const start = (page - 1) * PAGE_SIZE;
		return filtered.slice(start, start + PAGE_SIZE);
	}, [filtered, page]);

	const kpi = useMemo(() => {
		const systemCount = roles.filter((r) => r.isSystem).length;
		const customCount = roles.length - systemCount;
		const grantedPerms = new Set<string>();
		for (const r of roles) {
			for (const code of r.permissions) grantedPerms.add(code);
		}
		return {
			total: roles.length,
			system: systemCount,
			custom: customCount,
			granted: grantedPerms.size,
		};
	}, [roles]);

	async function handleDelete(role: RolePublicShape) {
		if (role.isSystem) return;
		setActionError(null);
		try {
			await onDelete(role.id);
			setPendingDeleteId(null);
		} catch (err) {
			setActionError((err as Error).message);
		}
	}

	if (loading && roles.length === 0) {
		return <ListSkeleton withToolbar={false} rows={6} />;
	}

	if (error) {
		return (
			<div className="rounded-[14px] border border-destructive/40 bg-destructive/5 p-6 text-sm text-destructive">
				Lỗi: {error}
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col gap-6">
			<header className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
				<div className="space-y-1.5">
					<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
						Quản lý · Vai trò
					</p>
					<h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground">
						Vai trò quản trị
					</h1>
					<p className="text-sm text-muted-foreground">
						{kpi.total} vai trò · {kpi.system} hệ thống · {kpi.custom} tuỳ chỉnh
						· {kpi.granted} quyền đang được cấp
					</p>
				</div>
				<Can permission="admin.role:create">
					<Link
						href="/admin/settings/roles/new"
						className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(92,173,69,0.25)] transition-all duration-200 ease-out hover:bg-primary-hover hover:shadow-[0_4px_14px_rgba(92,173,69,0.32)] active:scale-[0.98]"
					>
						<Plus className="size-4" aria-hidden />
						Tạo vai trò
					</Link>
				</Can>
			</header>

			<RoleKpiStrip
				total={kpi.total}
				system={kpi.system}
				custom={kpi.custom}
				granted={kpi.granted}
			/>

			{actionError ? (
				<div
					role="alert"
					className="rounded-[10px] border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive"
				>
					{actionError}
				</div>
			) : null}

			<RoleToolbar
				query={query}
				onQuery={setQuery}
				scope={scope}
				onScope={setScope}
				sort={sort}
				onSort={setSort}
			/>

			{/* Mobile/tablet — card list */}
			<div className="flex flex-col gap-3 lg:hidden">
				{mobileItems.length === 0 ? (
					<RoleEmptyState />
				) : (
					mobileItems
						.filter((r) => filtered.some((f) => f.id === r.id))
						.map((role) => (
							<RoleCard
								key={role.id}
								role={role}
								isPendingDelete={pendingDeleteId === role.id}
								onRequestDelete={() => setPendingDeleteId(role.id)}
								onCancelDelete={() => setPendingDeleteId(null)}
								onConfirmDelete={() => handleDelete(role)}
							/>
						))
				)}
			</div>

			{/* Desktop — bang hairline */}
			<div className="hidden lg:block">
				<div className="overflow-hidden rounded-[14px] border border-border/60 bg-card">
					<table className="w-full border-collapse text-left">
						<thead>
							<tr className="border-b border-border/60 bg-muted/30 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
								<th
									scope="col"
									className="min-w-[140px] whitespace-nowrap px-4 py-3"
								>
									Mã
								</th>
								<th scope="col" className="min-w-[220px] px-4 py-3">
									Tên hiển thị
								</th>
								<th
									scope="col"
									className="min-w-[110px] whitespace-nowrap px-4 py-3"
								>
									Phạm vi
								</th>
								<th
									scope="col"
									className="min-w-[100px] whitespace-nowrap px-4 py-3 text-right"
								>
									Quyền
								</th>
								<th
									scope="col"
									className="min-w-[80px] whitespace-nowrap px-4 py-3"
								>
									Loại
								</th>
								<th
									scope="col"
									className="min-w-[60px] whitespace-nowrap px-4 py-3 text-right"
								>
									<span className="sr-only">Hành động</span>
								</th>
							</tr>
						</thead>
						<tbody>
							{filtered.length === 0 ? (
								<tr>
									<td colSpan={6} className="p-0">
										<EmptyTable />
									</td>
								</tr>
							) : (
								paged.map((role) => {
									const isPending = pendingDeleteId === role.id;
									return (
										<tr
											key={role.id}
											className="group border-b border-border/60 align-middle transition-colors duration-150 ease-out last:border-b-0 hover:bg-muted/30"
										>
											<td className="whitespace-nowrap px-4 py-3.5 font-mono text-[13px] text-foreground/80">
												{role.code}
											</td>
											<td className="px-4 py-3.5">
												<Link
													href={`/admin/settings/roles/${role.id}`}
													className="text-sm font-semibold text-foreground transition-colors duration-150 hover:text-primary"
												>
													{role.name}
												</Link>
											</td>
											<td className="whitespace-nowrap px-4 py-3.5">
												<ScopeBadge isAdmin={role.isAdmin} />
											</td>
											<td className="whitespace-nowrap px-4 py-3.5 text-right">
												<span className="inline-flex items-center gap-1.5 font-mono text-[13px] tabular-nums text-foreground/80">
													<KeyRound
														className="size-3 text-muted-foreground"
														aria-hidden
													/>
													{role.permissions.length}
												</span>
											</td>
											<td className="whitespace-nowrap px-4 py-3.5">
												{role.isSystem ? (
													<span
														className={cn(
															"inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
															SYSTEM_BADGE,
														)}
													>
														Hệ thống
													</span>
												) : (
													<span className="text-xs text-muted-foreground">
														Tuỳ chỉnh
													</span>
												)}
											</td>
											<td className="whitespace-nowrap px-4 py-3.5 text-right">
												{isPending ? (
													<InlineDeleteConfirm
														onCancel={() => setPendingDeleteId(null)}
														onConfirm={() => handleDelete(role)}
													/>
												) : (
													<RoleActionsMenu role={role} />
												)}
											</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>

				{filtered.length > 0 ? (
					<div className="mt-3">
						<DataPagination
							page={page}
							pageCount={pageCount}
							total={total}
							pageSize={PAGE_SIZE}
							noun="vai trò"
							onPage={(p) => setPage(p)}
						/>
					</div>
				) : null}
			</div>
		</div>
	);
}

function EmptyTable() {
	return (
		<div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
			<span
				aria-hidden
				className="flex size-14 items-center justify-center rounded-2xl bg-muted"
			>
				<ShieldCheck className="size-7 text-muted-foreground" />
			</span>
			<div className="space-y-1">
				<p className="text-base font-semibold text-foreground">
					Chưa có vai trò nào
				</p>
				<p className="mx-auto max-w-md text-sm text-muted-foreground">
					Tạo vai trò đầu tiên để gom nhóm quyền, sau đó gán cho tài khoản quản
					trị trong khu quản trị nội bộ.
				</p>
			</div>
			<Can permission="admin.role:create">
				<Link
					href="/admin/settings/roles/new"
					className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(92,173,69,0.25)] transition-all duration-200 ease-out hover:bg-primary-hover hover:shadow-[0_4px_14px_rgba(92,173,69,0.32)] active:scale-[0.98]"
				>
					<Plus className="size-4" aria-hidden />
					Tạo vai trò
				</Link>
			</Can>
		</div>
	);
}
