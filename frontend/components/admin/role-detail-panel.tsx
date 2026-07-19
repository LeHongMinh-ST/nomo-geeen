"use client";

import {
	AlertTriangle,
	ChevronLeft,
	Clock,
	KeyRound,
	ShieldCheck,
	Trash2,
	X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type {
	PermissionPublicShape,
	RolePublicShape,
} from "@/lib/admin-api/roles";
import { cn } from "@/lib/utils";
import { Can } from "./can-permission";
import {
	RoleEditorForm,
	type UpdateSubmit,
} from "./role-editor-form";

const SYSTEM_BADGE =
	"bg-slate-100 text-slate-700 ring-1 ring-slate-200/80";
const ADMIN_BADGE = "bg-blue-50 text-blue-700 ring-1 ring-blue-200/80";
const TENANT_BADGE = "bg-muted text-muted-foreground ring-1 ring-border";

interface Props {
	role: RolePublicShape;
	permissionsByResource: Map<
		PermissionPublicShape["resource"],
		PermissionPublicShape[]
	>;
	permissions: PermissionPublicShape[];
	saving: boolean;
	error: string | null;
	onUpdate: (roleId: string, input: UpdateSubmit) => Promise<void>;
	onDelete: (roleId: string) => Promise<void>;
}

/**
 * Trang chi tiết vai trò - editorial dashboard.
 * Hero card gồm name + code + badge phạm vi + meta.
 * Form edit ở dưới (dùng RoleEditorForm mode="edit").
 * Danger zone ở cuối với inline 2-step confirm.
 */
export function RoleDetailPanel({
	role,
	permissions,
	permissionsByResource,
	saving,
	error,
	onUpdate,
	onDelete,
}: Props) {
	const [pendingDelete, setPendingDelete] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);

	async function handleDelete() {
		setActionError(null);
		try {
			await onDelete(role.id);
			// success -> parent navigate về list
		} catch (err) {
			setActionError((err as Error).message);
			setPendingDelete(false);
		}
	}

	return (
		<div className="flex flex-col gap-6">
			{/* Breadcrumb */}
			<nav
				aria-label="Breadcrumb"
				className="flex items-center gap-1.5 text-xs text-muted-foreground"
			>
				<Link
					href="/admin/settings"
					className="inline-flex items-center gap-1 rounded-[6px] px-1.5 py-1 transition-colors duration-150 hover:bg-soft hover:text-foreground"
				>
					<ChevronLeft className="size-3" aria-hidden />
					Vai trò
				</Link>
				<span aria-hidden className="text-muted-foreground/50">
					/
				</span>
				<span className="font-mono text-foreground/80">{role.code}</span>
			</nav>

			{/* Hero */}
			<header className="rounded-[14px] border border-border/60 bg-card p-5">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
					<div className="min-w-0 space-y-2">
						<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
							Quản lý · Vai trò
						</p>
						<div className="flex flex-wrap items-center gap-2.5">
							<h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground">
								{role.name}
							</h1>
							{role.isSystem ? (
								<span
									className={cn(
										"inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
										SYSTEM_BADGE,
									)}
								>
									Hệ thống
								</span>
							) : null}
							<span
								className={cn(
									"inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
									role.isAdmin ? ADMIN_BADGE : TENANT_BADGE,
								)}
							>
								{role.isAdmin ? "Phạm vi Admin" : "Phạm vi Tenant"}
							</span>
						</div>
						<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
							<span className="inline-flex items-center gap-1.5">
								<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground/80">
									{role.code}
								</code>
							</span>
							<span className="text-muted-foreground/40" aria-hidden>
								·
							</span>
							<span className="inline-flex items-center gap-1.5">
								<Clock className="size-3" aria-hidden />
								Tạo {formatRelative(role.createdAt)}
							</span>
							{role.updatedAt && role.updatedAt !== role.createdAt ? (
								<>
									<span className="text-muted-foreground/40" aria-hidden>
										·
									</span>
									<span className="inline-flex items-center gap-1.5">
										Cập nhật {formatRelative(role.updatedAt)}
									</span>
								</>
							) : null}
						</div>
					</div>

					<dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-border/60 bg-border/60 sm:min-w-[280px] lg:grid-cols-2">
						<HeroStat
							label="Số quyền"
							value={role.permissions.length}
							hint="Mã quyền đang được cấp"
						/>
						<HeroStat
							label="Loại"
							value={role.isSystem ? "Hệ thống" : "Tuỳ chỉnh"}
							hint={role.isSystem ? "Khoá mã" : "Có thể sửa/xoá"}
						/>
					</dl>
				</div>
			</header>

			{(actionError ?? error) ? (
				<div
					role="alert"
					className="rounded-[10px] border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive"
				>
					{actionError ?? error}
				</div>
			) : null}

			{/* Form edit */}
			<Can permission="admin.role:edit">
				<RoleEditorForm
					mode="edit"
					role={role}
					permissions={permissions}
					permissionsByResource={permissionsByResource}
					onSubmit={async (input) => {
						setActionError(null);
						try {
							await onUpdate(role.id, input);
						} catch (err) {
							setActionError((err as Error).message);
							throw err;
						}
					}}
				/>
			</Can>

			{/* Danger zone */}
			{role.isSystem ? null : (
				<section className="rounded-[14px] border border-destructive/30 bg-card">
					<header className="flex items-center gap-2 border-b border-destructive/20 px-5 py-3">
						<span
							aria-hidden
							className="flex size-7 items-center justify-center rounded-[8px] bg-destructive/10 text-destructive"
						>
							<AlertTriangle className="size-3.5" />
						</span>
						<div className="flex flex-col leading-tight">
							<span className="text-sm font-semibold text-foreground">
								Khu vực nguy hiểm
							</span>
							<span className="text-xs text-muted-foreground">
								Hành động này không thể hoàn tác.
							</span>
						</div>
					</header>
					<div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
						<p className="text-sm text-muted-foreground">
							Xoá vai trò sẽ thu hồi quyền khỏi mọi tài khoản đang được gán.
						</p>
						<Can permission="admin.role:delete">
							{pendingDelete ? (
								<div className="flex items-center gap-2">
									<button
										type="button"
										onClick={() => setPendingDelete(false)}
										className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-soft"
									>
										<X className="size-4" aria-hidden />
										Huỷ
									</button>
									<button
										type="button"
										disabled={saving}
										onClick={() => void handleDelete()}
										className="inline-flex h-10 items-center gap-1.5 rounded-[10px] bg-destructive px-3 text-sm font-semibold text-white transition-colors duration-150 hover:bg-destructive/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
									>
										<Trash2 className="size-4" aria-hidden />
										Xác nhận xoá
									</button>
								</div>
							) : (
								<button
									type="button"
									onClick={() => setPendingDelete(true)}
									className="inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-destructive/40 bg-card px-3 text-sm font-semibold text-destructive transition-colors duration-150 hover:bg-destructive/10"
								>
									<Trash2 className="size-4" aria-hidden />
									Xoá vai trò
								</button>
							)}
						</Can>
					</div>
				</section>
			)}
		</div>
	);
}

function HeroStat({
	label,
	value,
	hint,
}: {
	label: string;
	value: number | string;
	hint: string;
}) {
	return (
		<div className="flex flex-col gap-1 bg-card p-3.5">
			<dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
				{label}
			</dt>
			<dd className="text-[20px] font-semibold tabular-nums tracking-[-0.01em] text-foreground">
				{value}
			</dd>
			<dd className="text-[11px] text-muted-foreground/80">{hint}</dd>
		</div>
	);
}

function formatRelative(iso: string): string {
	const then = new Date(iso).getTime();
	if (Number.isNaN(then)) return iso;
	const diff = Date.now() - then;
	const min = Math.floor(diff / 60_000);
	if (min < 1) return "vừa xong";
	if (min < 60) return `${min} phút trước`;
	const hr = Math.floor(min / 60);
	if (hr < 24) return `${hr} giờ trước`;
	const day = Math.floor(hr / 24);
	if (day < 7) return `${day} ngày trước`;
	return new Date(iso).toLocaleDateString("vi-VN");
}

export function RoleDetailEmpty() {
	return (
		<div className="flex flex-col items-center gap-3 rounded-[14px] border border-dashed border-border/80 bg-card px-4 py-10 text-center text-muted-foreground">
			<span
				aria-hidden
				className="flex size-12 items-center justify-center rounded-[12px] bg-muted"
			>
				<ShieldCheck className="size-6 text-muted-foreground" />
			</span>
			<div className="space-y-1">
				<p className="text-sm font-semibold text-foreground">
					Không tìm thấy vai trò
				</p>
				<p className="text-xs text-muted-foreground">
					Vai trò đã bị xoá hoặc bạn không có quyền truy cập.
				</p>
			</div>
			<Link
				href="/admin/settings"
				className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors duration-150 hover:bg-soft"
			>
				<KeyRound className="size-3.5" aria-hidden />
				Quay lại danh sách
			</Link>
		</div>
	);
}
