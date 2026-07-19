"use client";

import {
	KeyRound,
	MoreHorizontal,
	Pencil,
	ShieldCheck,
	Trash2,
	X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { RolePublicShape } from "@/lib/admin-api/roles";
import { cn } from "@/lib/utils";
import { Can } from "./can-permission";

const SYSTEM_BADGE =
	"bg-slate-100 text-slate-700 ring-1 ring-slate-200/80";
const ADMIN_BADGE = "bg-blue-50 text-blue-700 ring-1 ring-blue-200/80";
const TENANT_BADGE = "bg-muted text-muted-foreground ring-1 ring-border";

/** Badge phạm vi (Admin / Tenant) - dùng chính cho bảng + card. */
export function ScopeBadge({ isAdmin }: { isAdmin: boolean }) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
				isAdmin ? ADMIN_BADGE : TENANT_BADGE,
			)}
		>
			{isAdmin ? "Admin" : "Tenant"}
		</span>
	);
}

/** Dropdown action menu cho 1 dòng trong bảng (Linear style). */
export function RoleActionsMenu({ role }: { role: RolePublicShape }) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		function handle(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		function key(e: KeyboardEvent) {
			if (e.key === "Escape") setOpen(false);
		}
		document.addEventListener("mousedown", handle);
		document.addEventListener("keydown", key);
		return () => {
			document.removeEventListener("mousedown", handle);
			document.removeEventListener("keydown", key);
		};
	}, [open]);

	return (
		<div className="relative inline-flex" ref={ref}>
			<button
				type="button"
				aria-label={`Hành động cho ${role.name}`}
				aria-haspopup="menu"
				aria-expanded={open}
				onClick={() => setOpen((o) => !o)}
				className="inline-flex size-9 items-center justify-center rounded-[8px] text-muted-foreground transition-colors duration-150 hover:bg-soft hover:text-foreground focus-visible:bg-soft focus-visible:text-foreground focus-visible:outline-none"
			>
				<MoreHorizontal className="size-4" aria-hidden />
			</button>
			{open ? (
				<div
					role="menu"
					className="absolute right-0 top-full z-30 mt-1.5 min-w-[180px] overflow-hidden rounded-[10px] border border-border/60 bg-card shadow-lg"
				>
					<Link
						href={`/admin/settings/roles/${role.id}`}
						role="menuitem"
						onClick={() => setOpen(false)}
						className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground transition-colors duration-150 hover:bg-muted/30"
					>
						<Pencil className="size-3.5" aria-hidden />
						{role.isSystem ? "Xem chi tiết" : "Sửa vai trò"}
					</Link>
					{role.isSystem ? null : (
						<Can permission="admin.role:delete">
							<button
								type="button"
								role="menuitem"
								onClick={() => {
									setOpen(false);
									// Bấm xoá trong menu = mở inline confirm 2-step (§21)
									// — đặt pending qua window event để bảng lắng nghe.
									window.dispatchEvent(
										new CustomEvent("role:request-delete", {
											detail: { id: role.id },
										}),
									);
								}}
								className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-destructive transition-colors duration-150 hover:bg-destructive/10"
							>
								<Trash2 className="size-3.5" aria-hidden />
								Xoá vai trò
							</button>
						</Can>
					)}
				</div>
			) : null}
		</div>
	);
}

/** Inline 2-step confirm - thay thế action menu khi user vừa bấm Xoá. */
export function InlineDeleteConfirm({
	onCancel,
	onConfirm,
}: {
	onCancel: () => void;
	onConfirm: () => void;
}) {
	return (
		<div className="inline-flex items-center gap-1.5">
			<button
				type="button"
				onClick={onCancel}
				className="inline-flex h-9 items-center gap-1 rounded-[8px] border border-border/60 bg-card px-2.5 text-xs font-semibold text-foreground transition-colors duration-150 hover:bg-muted/30"
			>
				<X className="size-3.5" aria-hidden />
				Huỷ
			</button>
			<button
				type="button"
				onClick={onConfirm}
				className="inline-flex h-9 items-center gap-1 rounded-[8px] bg-destructive px-2.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-destructive/90 active:scale-[0.98]"
			>
				<Trash2 className="size-3.5" aria-hidden />
				Xoá
			</button>
		</div>
	);
}

/** Card list phiên bản mobile (DESIGN.md §12.1). */
export function RoleCard({
	role,
	isPendingDelete,
	onRequestDelete,
	onCancelDelete,
	onConfirmDelete,
}: {
	role: RolePublicShape;
	isPendingDelete: boolean;
	onRequestDelete: () => void;
	onCancelDelete: () => void;
	onConfirmDelete: () => void;
}) {
	return (
		<div className="flex flex-col gap-3 rounded-[14px] border border-border/60 bg-card p-4">
			<div className="flex items-start justify-between gap-2">
				<Link
					href={`/admin/settings/roles/${role.id}`}
					className="min-w-0 text-base font-semibold text-foreground transition-colors hover:text-primary"
				>
					{role.name}
				</Link>
				{role.isSystem ? (
					<span
						className={cn(
							"shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold",
							SYSTEM_BADGE,
						)}
					>
						Hệ thống
					</span>
				) : null}
			</div>
			<div className="flex items-center gap-2 text-xs">
				<code className="font-mono text-foreground/70">{role.code}</code>
				<ScopeBadge isAdmin={role.isAdmin} />
			</div>
			<div className="flex items-center justify-between border-t border-border/60 pt-3 text-sm">
				<span className="inline-flex items-center gap-1.5 text-muted-foreground">
					<KeyRound className="size-3" aria-hidden />
					<span className="font-mono tabular-nums text-foreground/80">
						{role.permissions.length}
					</span>{" "}
					quyền
				</span>
				{isPendingDelete ? (
					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={onCancelDelete}
							className="inline-flex h-9 items-center gap-1 rounded-[8px] border border-border/60 bg-card px-3 text-xs font-semibold hover:bg-muted/30"
						>
							<X className="size-3.5" aria-hidden />
							Huỷ
						</button>
						<button
							type="button"
							onClick={onConfirmDelete}
							className="inline-flex h-9 items-center gap-1 rounded-[8px] bg-destructive px-3 text-xs font-semibold text-white hover:bg-destructive/90"
						>
							<Trash2 className="size-3.5" aria-hidden />
							Xoá
						</button>
					</div>
				) : (
					<div className="flex items-center gap-1.5">
						<Link
							href={`/admin/settings/roles/${role.id}`}
							className="inline-flex h-9 items-center gap-1 rounded-[8px] border border-border/60 bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted/30"
						>
							<Pencil className="size-3.5" aria-hidden />
							{role.isSystem ? "Xem" : "Sửa"}
						</Link>
						{role.isSystem ? null : (
							<Can permission="admin.role:delete">
								<button
									type="button"
									onClick={onRequestDelete}
									className="inline-flex h-9 items-center gap-1 rounded-[8px] border border-destructive/30 bg-card px-3 text-xs font-semibold text-destructive hover:bg-destructive/10"
								>
									<Trash2 className="size-3.5" aria-hidden />
									Xoá
								</button>
							</Can>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

/** Empty state cho card list mobile khi filter không có kết quả. */
export function RoleEmptyState() {
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
					Chưa có vai trò nào khớp
				</p>
				<p className="text-xs text-muted-foreground">
					Thử bỏ bộ lọc hoặc tạo vai trò mới.
				</p>
			</div>
		</div>
	);
}
