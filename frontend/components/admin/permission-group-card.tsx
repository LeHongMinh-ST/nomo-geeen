"use client";

import {
	Boxes,
	Building2,
	KeyRound,
	type LucideIcon,
	ScrollText,
	ShieldCheck,
	Sparkles,
	Tag,
	Users,
} from "lucide-react";
import { useMemo } from "react";
import type { PermissionPublicShape } from "@/lib/admin-api/roles";
import { cn } from "@/lib/utils";

const RESOURCE_ICONS: Record<string, LucideIcon> = {
	user: Users,
	account: Users,
	tenant: Building2,
	role: ShieldCheck,
	permission: KeyRound,
	audit: ScrollText,
	report: ScrollText,
	support: ScrollText,
	billing: Sparkles,
	plan: Sparkles,
	subscription: Sparkles,
	tag: Tag,
};

// Fallback khi server chua co label (data cu). Moi permission admin.* moi
// deu co label tu seed (R7.5+).
const RESOURCE_FALLBACK_LABELS: Record<string, string> = {
	user: "Người dùng",
	role: "Vai trò",
	permission: "Quyền hệ thống",
	tenant: "Cửa hàng",
	billing: "Tài chính",
	report: "Báo cáo",
	support: "Hỗ trợ",
	plan: "Gói dịch vụ",
	subscription: "Gói đăng ký",
};

const RESOURCE_TONES: Record<string, string> = {
	user: "bg-blue-50 text-blue-700 ring-blue-200/80",
	account: "bg-blue-50 text-blue-700 ring-blue-200/80",
	tenant: "bg-emerald-50 text-emerald-700 ring-emerald-200/80",
	role: "bg-amber-50 text-amber-700 ring-amber-200/80",
	permission: "bg-violet-50 text-violet-700 ring-violet-200/80",
	audit: "bg-slate-100 text-slate-700 ring-slate-200/80",
	report: "bg-slate-100 text-slate-700 ring-slate-200/80",
	support: "bg-slate-100 text-slate-700 ring-slate-200/80",
	billing: "bg-rose-50 text-rose-700 ring-rose-200/80",
	plan: "bg-rose-50 text-rose-700 ring-rose-200/80",
	subscription: "bg-rose-50 text-rose-700 ring-rose-200/80",
	tag: "bg-cyan-50 text-cyan-700 ring-cyan-200/80",
};

// Label tieng Viet cho action badge. Trung fallback cu de giu tuong thich
// action cu (list/assign/...).
const ACTION_LABELS_VI: Record<string, string> = {
	view: "Xem",
	list: "Xem",
	create: "Tạo",
	edit: "Sửa",
	update: "Sửa",
	delete: "Xoá",
	assign: "Gán",
	revoke: "Thu hồi",
	approve: "Duyệt",
	export: "Xuất",
	deactivate: "Vô hiệu hoá",
	reactivate: "Kích hoạt lại",
	reset_password: "Đặt lại MK",
	reply: "Phản hồi",
	activate: "Kích hoạt",
};

const ACTION_TONES: Record<string, string> = {
	view: "text-blue-700 bg-blue-50",
	list: "text-blue-700 bg-blue-50",
	create: "text-emerald-700 bg-emerald-50",
	edit: "text-amber-700 bg-amber-50",
	update: "text-amber-700 bg-amber-50",
	delete: "text-rose-700 bg-rose-50",
	assign: "text-violet-700 bg-violet-50",
	revoke: "text-rose-700 bg-rose-50",
	approve: "text-emerald-700 bg-emerald-50",
	export: "text-slate-700 bg-slate-100",
	deactivate: "text-rose-700 bg-rose-50",
	reactivate: "text-emerald-700 bg-emerald-50",
	reset_password: "text-amber-700 bg-amber-50",
	reply: "text-blue-700 bg-blue-50",
	activate: "text-emerald-700 bg-emerald-50",
};

interface Props {
	resource: string;
	permissions: PermissionPublicShape[];
	selectedIds: Set<string>;
	filter: string;
	onToggle: (id: string) => void;
	onToggleAll: (ids: string[], next: boolean) => void;
}

export function PermissionGroupCard({
	resource,
	permissions,
	selectedIds,
	filter,
	onToggle,
	onToggleAll,
}: Props) {
	const Icon = RESOURCE_ICONS[resource] ?? Boxes;
	const label = RESOURCE_FALLBACK_LABELS[resource] ?? resource;
	const tone =
		RESOURCE_TONES[resource] ?? "bg-muted text-muted-foreground ring-border";

	const filtered = useMemo(() => {
		const q = filter.trim().toLowerCase();
		if (!q) return permissions;
		return permissions.filter(
			(p) =>
				p.code.toLowerCase().includes(q) ||
				p.action.toLowerCase().includes(q) ||
				(p.label ?? "").toLowerCase().includes(q),
		);
	}, [permissions, filter]);

	if (filtered.length === 0) return null;

	const allIds = filtered.map((p) => p.id);
	const allChecked = allIds.every((id) => selectedIds.has(id));
	const someChecked = allIds.some((id) => selectedIds.has(id));
	const selectedCount = allIds.filter((id) => selectedIds.has(id)).length;

	return (
		<section className="overflow-hidden rounded-[12px] border border-border/60 bg-card">
			<header className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-4 py-3">
				<div className="flex items-center gap-2.5">
					<span
						className={cn(
							"flex size-7 shrink-0 items-center justify-center rounded-[8px] ring-1",
							tone,
						)}
					>
						<Icon className="size-3.5" aria-hidden />
					</span>
					<div className="flex flex-col leading-tight">
						<span className="text-sm font-semibold text-foreground">
							{label}
						</span>
						<span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground/80">
							{resource} - {selectedCount}/{filtered.length}
						</span>
					</div>
				</div>
				<button
					type="button"
					onClick={() => onToggleAll(allIds, !allChecked)}
					className="inline-flex h-7 items-center gap-1 rounded-[6px] px-2 text-xs font-semibold text-muted-foreground transition-colors duration-150 hover:bg-soft hover:text-foreground"
				>
					{allChecked ? "Bỏ chọn tất cả" : "Chọn tất cả"}
				</button>
			</header>
			<ul className="grid grid-cols-1 md:grid-cols-2 md:divide-x md:divide-border/60">
				{filtered.map((p, idx) => {
					const checked = selectedIds.has(p.id);
					const isLastOdd = idx === filtered.length - 1 && idx % 2 === 0;
					return (
						<li
							key={p.id}
							className={cn(
								"border-b border-border/60 last:border-b-0 md:border-b-0",
								idx % 2 === 0 ? "md:border-r md:border-border/60" : "",
								isLastOdd ? "md:border-b-0" : "",
							)}
						>
							<PermissionRow
								permission={p}
								checked={checked}
								someChecked={someChecked && !allChecked}
								onToggle={() => onToggle(p.id)}
							/>
						</li>
					);
				})}
			</ul>
		</section>
	);
}

function PermissionRow({
	permission,
	checked,
	onToggle,
}: {
	permission: PermissionPublicShape;
	checked: boolean;
	someChecked: boolean;
	onToggle: () => void;
}) {
	const actionTone =
		ACTION_TONES[permission.action] ?? "text-muted-foreground bg-muted";
	const actionLabel = ACTION_LABELS_VI[permission.action] ?? permission.action;

	return (
		<label
			className={cn(
				"group flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors duration-150",
				checked
					? "bg-primary-soft/60 hover:bg-primary-soft"
					: "hover:bg-muted/30",
			)}
		>
			<span
				aria-hidden
				className={cn(
					"flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors duration-150",
					checked
						? "border-primary bg-primary"
						: "border-border bg-card group-hover:border-foreground/40",
				)}
			>
				{checked ? (
					<svg
						width="10"
						height="10"
						viewBox="0 0 10 10"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden
					>
						<title>Đã chọn</title>
						<path
							d="M1.5 5.5L4 8L8.5 2.5"
							stroke="white"
							strokeWidth="1.75"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				) : null}
			</span>
			<input
				type="checkbox"
				checked={checked}
				onChange={onToggle}
				className="sr-only"
				aria-label={permission.label ?? permission.code}
			/>
			<div className="flex min-w-0 flex-1 items-center gap-2">
				<span className="truncate text-sm text-foreground">
					{permission.label ?? permission.code}
				</span>
				<span
					className={cn(
						"shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tracking-wide",
						actionTone,
					)}
				>
					{actionLabel}
				</span>
				{permission.label ? (
					<code className="hidden truncate font-mono text-[11px] text-muted-foreground/70 sm:inline">
						{permission.code}
					</code>
				) : null}
			</div>
		</label>
	);
}
