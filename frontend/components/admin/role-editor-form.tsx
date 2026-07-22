"use client";

import { AlertTriangle, Search, Wand2, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
	PermissionPublicShape,
	RolePublicShape,
} from "@/lib/admin-api/roles";
import { cn } from "@/lib/utils";
import { PermissionGroupCard } from "./permission-group-card";

export interface CreateSubmit {
	code: string;
	name: string;
	permissionIds: string[];
}

export interface UpdateSubmit {
	name?: string;
	addPermissionIds?: string[];
	removePermissionIds?: string[];
}

interface CreateProps {
	mode: "create";
	permissions: PermissionPublicShape[];
	permissionsByResource: Map<string, PermissionPublicShape[]>;
	templates?: RolePublicShape[];
	onSubmit: (input: CreateSubmit) => Promise<void>;
}

interface EditProps {
	mode: "edit";
	role: RolePublicShape;
	permissions: PermissionPublicShape[];
	permissionsByResource: Map<string, PermissionPublicShape[]>;
	onSubmit: (input: UpdateSubmit) => Promise<void>;
}

type Props = CreateProps | EditProps;

/**
 * Form 2 cột (DESIGN.md §10.4 + §15):
 * - Trái (40%): thông tin cơ bản (mã, tên) - sticky desktop.
 * - Phải (60%): permission matrix theo resource - search + checkbox custom.
 * - Footer: nút Huỷ + Lưu, mobile sticky bottom.
 */
export function RoleEditorForm(props: Props) {
	const isEdit = props.mode === "edit";
	const role = isEdit ? props.role : undefined;
	// `templates` chỉ dùng cho UI, chưa expose picker trong phase này.
	void (!isEdit ? props.templates : undefined);

	const currentIds = useMemo(
		() =>
			role
				? new Set(
						props.permissions
							.filter((p) => role.permissions.includes(p.code))
							.map((p) => p.id),
					)
				: new Set<string>(),
		[role, props.permissions],
	);

	const [code, setCode] = useState(role?.code ?? "");
	const [name, setName] = useState(role?.name ?? "");
	const [selectedIds, setSelectedIds] = useState<Set<string>>(
		() => new Set(currentIds),
	);
	const [permissionFilter, setPermissionFilter] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		setCode(role?.code ?? "");
		setName(role?.name ?? "");
		setSelectedIds(new Set(currentIds));
		setError(null);
	}, [role, currentIds]);

	const codeDisabled = isEdit && Boolean(role?.isSystem);
	const systemLocked = isEdit && Boolean(role?.isSystem);

	const grouped = useMemo(
		() =>
			Array.from(props.permissionsByResource.entries()).sort(([a], [b]) =>
				a.localeCompare(b),
			),
		[props.permissionsByResource],
	);

	const totalPermissions = props.permissions.length;
	const selectedCount = selectedIds.size;

	function toggle(id: string) {
		if (systemLocked) return;
		setSelectedIds((cur) => {
			const next = new Set(cur);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}

	function toggleAll(ids: string[], next: boolean) {
		if (systemLocked) return;
		setSelectedIds((cur) => {
			const out = new Set(cur);
			for (const id of ids) {
				if (next) out.add(id);
				else out.delete(id);
			}
			return out;
		});
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (systemLocked) {
			setError("Vai trò hệ thống không thể đổi tên hoặc quyền.");
			return;
		}
		setSubmitting(true);
		setError(null);
		try {
			if (isEdit && role) {
				const addIds: string[] = [];
				const removeIds: string[] = [];
				for (const id of selectedIds) {
					if (!currentIds.has(id)) addIds.push(id);
				}
				for (const id of currentIds) {
					if (!selectedIds.has(id)) removeIds.push(id);
				}
				const payload: UpdateSubmit = {
					name: name !== role.name ? name : undefined,
					addPermissionIds: addIds.length > 0 ? addIds : undefined,
					removePermissionIds: removeIds.length > 0 ? removeIds : undefined,
				};
				await props.onSubmit(payload);
			} else {
				const payload: CreateSubmit = {
					code,
					name,
					permissionIds: Array.from(selectedIds),
				};
				await props.onSubmit(payload);
			}
		} catch (err) {
			setError((err as Error).message);
		} finally {
			setSubmitting(false);
		}
	}

	const submitBar = (
		<div className="flex w-full items-center justify-end gap-2">
			<Link
				href="/admin/settings"
				className="inline-flex h-11 items-center gap-1.5 rounded-[10px] border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-soft"
			>
				<X className="size-4" aria-hidden />
				Huỷ
			</Link>
			<button
				type="submit"
				disabled={submitting || systemLocked || !code || !name}
				className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(92,173,69,0.25)] transition-all duration-200 ease-out hover:bg-primary-hover hover:shadow-[0_4px_14px_rgba(92,173,69,0.32)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none sm:flex-none"
			>
				{submitting
					? "Đang lưu..."
					: systemLocked
						? "Chỉ xem"
						: isEdit
							? "Lưu thay đổi"
							: "Tạo vai trò"}
			</button>
		</div>
	);

	return (
		<form
			onSubmit={(e) => void handleSubmit(e)}
			className="flex flex-col gap-6"
		>
			<div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
				<aside className="flex flex-col gap-3 lg:sticky lg:top-20 lg:self-start">
					{isEdit && role?.isSystem ? (
						<div className="flex items-start gap-2 rounded-[10px] border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-xs text-amber-800">
							<AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
							<div>
								<p className="font-semibold">Vai trò hệ thống</p>
								<p className="mt-0.5 text-amber-700/90">
									Mã, tên và tập quyền bị khoá. Chỉ xem (SYSTEM_ROLE_PROTECTED).
								</p>
							</div>
						</div>
					) : null}

					<Field
						label="Mã vai trò"
						hint="Mã định danh nội bộ, viết liền không dấu, viết hoa."
					>
						<input
							type="text"
							value={code}
							disabled={codeDisabled}
							onChange={(e) => setCode(e.target.value.toUpperCase())}
							required
							maxLength={64}
							className={cn(
								"h-11 w-full rounded-[10px] border border-border bg-background px-3 font-mono text-sm text-foreground outline-none transition-colors duration-150 placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20",
								codeDisabled &&
									"cursor-not-allowed bg-muted text-muted-foreground",
							)}
							placeholder="VD: BILLING_OPS"
						/>
					</Field>

					<Field
						label="Tên hiển thị"
						hint="Tên này sẽ hiển thị trong các menu và bảng."
					>
						<input
							type="text"
							value={name}
							disabled={systemLocked}
							onChange={(e) => setName(e.target.value)}
							required
							maxLength={120}
							className={cn(
								"h-11 w-full rounded-[10px] border border-border bg-background px-3 text-sm text-foreground outline-none transition-colors duration-150 placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/20",
								systemLocked &&
									"cursor-not-allowed bg-muted text-muted-foreground",
							)}
							placeholder="VD: Vận hành billing"
						/>
					</Field>

					{error ? (
						<div
							role="alert"
							className="rounded-[10px] border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive"
						>
							{error}
						</div>
					) : null}

					{!isEdit ? (
						<div className="flex items-start gap-2 rounded-[10px] border border-border/60 bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground">
							<Wand2 className="mt-0.5 size-3.5 text-primary" aria-hidden />
							<div>
								<p className="font-semibold text-foreground">Mẹo</p>
								<p className="mt-0.5 text-muted-foreground">
									Dùng các chip bên phải để chọn nhanh theo nhóm quyền.
								</p>
							</div>
						</div>
					) : null}
				</aside>

				<section className="flex min-w-0 flex-col gap-3">
					<header className="sticky top-0 z-10 flex flex-col gap-2 rounded-[10px] border border-border/60 bg-card/95 px-3 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-card/80 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex flex-col leading-tight">
							<span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
								Quyền được gán
							</span>
							<span className="text-sm font-semibold tabular-nums text-foreground">
								{selectedCount} / {totalPermissions} quyền đã chọn
							</span>
						</div>
						<label className="relative flex h-9 w-full items-center sm:w-64">
							<Search
								className="pointer-events-none absolute left-2.5 size-3.5 text-muted-foreground"
								aria-hidden
							/>
							<input
								type="search"
								value={permissionFilter}
								onChange={(e) => setPermissionFilter(e.target.value)}
								placeholder="Lọc theo tên, mã hoặc hành động..."
								className="h-9 w-full rounded-[8px] border border-border/60 bg-background pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
							/>
						</label>
					</header>

					<div className="flex flex-col gap-3">
						{grouped.map(([resource, perms]) => (
							<PermissionGroupCard
								key={resource}
								resource={resource}
								permissions={perms}
								selectedIds={selectedIds}
								filter={permissionFilter}
								readOnly={systemLocked}
								onToggle={toggle}
								onToggleAll={toggleAll}
							/>
						))}
					</div>
				</section>
			</div>

			<div className="hidden justify-end border-t border-border/60 pt-4 lg:flex">
				{submitBar}
			</div>

			<div className="sticky bottom-0 -mx-4 mt-2 border-t border-border bg-card px-4 py-3 lg:hidden">
				{submitBar}
			</div>
		</form>
	);
}

function Field({
	label,
	hint,
	children,
}: {
	label: string;
	hint?: string;
	children: React.ReactNode;
}) {
	return (
		<div className="block">
			<span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
				{label}
			</span>
			<div className="mt-1.5">{children}</div>
			{hint ? (
				<span className="mt-1 block text-[11px] text-muted-foreground/80">
					{hint}
				</span>
			) : null}
		</div>
	);
}
