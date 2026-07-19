"use client";

import {
	ArrowLeft,
	Ban,
	Check,
	CheckCircle2,
	Lock,
	Save,
	X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
	TenantDetail,
	TenantMode,
	TenantStatus,
	TenantType,
} from "@/lib/admin-api/tenants";
import { Can } from "./can-permission";
import { SubscriptionPanel } from "./subscription-panel";

const TYPE_OPTIONS: { value: TenantType; label: string }[] = [
	{ value: "HOUSEHOLD", label: "Hộ gia đình" },
	{ value: "RETAIL_DEALER", label: "Đại lý" },
	{ value: "COOPERATIVE", label: "Hợp tác xã" },
	{ value: "DISTRIBUTOR", label: "Nhà phân phối" },
	{ value: "FARM", label: "Trang trại" },
];

const STATUS_LABEL: Record<TenantStatus, string> = {
	ACTIVE: "Hoạt động",
	SUSPENDED: "Tạm ngưng",
	LOCKED: "Khóa",
};

// Bảng màu trạng thái (DESIGN.md §13) — cùng palette Success/Warning/Error
// với tenant-list.tsx và module Công nợ (frontend/lib/debts.ts).
const STATUS_BADGE_CLASS: Record<TenantStatus, string> = {
	ACTIVE: "bg-[#e8f5e9] text-[#2e7d32]",
	SUSPENDED: "bg-[#fff8e1] text-[#f57f17]",
	LOCKED: "bg-[#ffebee] text-[#c62828]",
};

/** Actions không nguy hiểm (khôi phục) bỏ qua bước xác nhận (DESIGN.md §21). */
const DANGEROUS_TRANSITIONS: TenantStatus[] = ["SUSPENDED", "LOCKED"];

const NEXT_TRANSITIONS: Record<TenantStatus, TenantStatus[]> = {
	ACTIVE: ["SUSPENDED", "LOCKED"],
	SUSPENDED: ["ACTIVE", "LOCKED"],
	LOCKED: ["ACTIVE"],
};

interface Props {
	tenant: TenantDetail;
	saving: boolean;
	error: string | null;
	onSave: (input: {
		name?: string;
		tenantType?: TenantType;
		mode?: TenantMode;
		logoUrl?: string | null;
		expectedUpdatedAt: string;
	}) => Promise<void>;
	onTransition: (input: {
		status: TenantStatus;
		reason?: string | null;
	}) => Promise<void>;
}

export function TenantDetailPanel({
	tenant,
	saving,
	error,
	onSave,
	onTransition,
}: Props) {
	const [name, setName] = useState(tenant.name);
	const [tenantType, setTenantType] = useState<TenantType>(tenant.tenantType);
	const [mode, setMode] = useState<TenantMode>(tenant.mode);
	const [logoUrl, setLogoUrl] = useState(tenant.logoUrl ?? "");
	const [reason, setReason] = useState("");
	const [actionError, setActionError] = useState<string | null>(null);
	const [localTenant, setLocalTenant] = useState(tenant);
	const [pendingTransition, setPendingTransition] =
		useState<TenantStatus | null>(null);

	useEffect(() => {
		setLocalTenant(tenant);
		setName(tenant.name);
		setTenantType(tenant.tenantType);
		setMode(tenant.mode);
		setLogoUrl(tenant.logoUrl ?? "");
	}, [tenant]);

	const dirty = useMemo(() => {
		return (
			name !== localTenant.name ||
			tenantType !== localTenant.tenantType ||
			mode !== localTenant.mode ||
			(logoUrl || null) !== (localTenant.logoUrl ?? null)
		);
	}, [name, tenantType, mode, logoUrl, localTenant]);

	async function handleSave(e: React.FormEvent) {
		e.preventDefault();
		setActionError(null);
		try {
			await onSave({
				name: name.trim(),
				tenantType,
				mode,
				logoUrl: logoUrl.trim() === "" ? null : logoUrl.trim(),
				expectedUpdatedAt: localTenant.updatedAt,
			});
		} catch (err) {
			setActionError((err as Error).message);
		}
	}

	async function handleTransition(next: TenantStatus) {
		setActionError(null);
		try {
			await onTransition({
				status: next,
				reason: reason.trim() || null,
			});
			setReason("");
		} catch (err) {
			setActionError((err as Error).message);
		}
	}

	/** Kích hoạt (khôi phục) chạy thẳng; Tạm ngưng/Khóa cần xác nhận 2 bước (DESIGN.md §21). */
	function requestTransition(next: TenantStatus) {
		if (DANGEROUS_TRANSITIONS.includes(next) && pendingTransition !== next) {
			setPendingTransition(next);
			return;
		}
		setPendingTransition(null);
		void handleTransition(next);
	}

	const nextStatuses = NEXT_TRANSITIONS[localTenant.status] ?? [];

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-3">
					<Link
						href="/admin/tenants"
						className="inline-flex size-11 items-center justify-center rounded-[10px] border border-border bg-card text-muted-foreground hover:bg-soft"
						aria-label="Quay lại danh sách"
					>
						<ArrowLeft className="size-4" aria-hidden />
					</Link>
					<div>
						<h1 className="text-xl font-bold tracking-tight">
							{localTenant.name}
						</h1>
						<p className="font-mono text-xs text-muted-foreground">
							{localTenant.slug}
						</p>
					</div>
				</div>
				<span
					className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_BADGE_CLASS[localTenant.status]}`}
				>
					{STATUS_LABEL[localTenant.status]}
				</span>
			</div>

			{actionError || error ? (
				<div
					role="alert"
					className="rounded-[10px] border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive"
				>
					{actionError ?? error}
				</div>
			) : null}

			<div className="grid gap-4 lg:grid-cols-3">
				<section className="space-y-3 rounded-[14px] border border-border bg-card p-4 lg:col-span-2">
					<h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
						Hồ sơ
					</h2>
					<form onSubmit={(e) => void handleSave(e)} className="space-y-3">
						<label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Tên
							<input
								value={name}
								onChange={(e) => setName(e.target.value)}
								maxLength={200}
								required
								className="mt-1.5 w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
							/>
						</label>
						<div className="grid gap-3 sm:grid-cols-2">
							<label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Loại
								<select
									value={tenantType}
									onChange={(e) => setTenantType(e.target.value as TenantType)}
									className="mt-1.5 w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
								>
									{TYPE_OPTIONS.map((o) => (
										<option key={o.value} value={o.value}>
											{o.label}
										</option>
									))}
								</select>
							</label>
							<label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								Chế độ
								<select
									value={mode}
									onChange={(e) => setMode(e.target.value as TenantMode)}
									className="mt-1.5 w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
								>
									<option value="SIMPLE">Đơn giản</option>
									<option value="ADVANCED">Nâng cao</option>
								</select>
							</label>
						</div>
						<label className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Logo URL (HTTPS)
							<input
								value={logoUrl}
								onChange={(e) => setLogoUrl(e.target.value)}
								placeholder="https://…"
								className="mt-1.5 w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
							/>
						</label>
						<Can permission="admin.tenant:edit">
							<button
								type="submit"
								disabled={!dirty || saving}
								className="inline-flex items-center gap-2 rounded-[10px] bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
							>
								<Save className="size-4" aria-hidden />
								{saving ? "Đang lưu…" : "Lưu thay đổi"}
							</button>
						</Can>
					</form>
				</section>

				<section className="space-y-4">
					<div className="rounded-[14px] border border-border bg-card p-4">
						<h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
							Thống kê
						</h2>
						<ul className="mt-3 space-y-2 text-sm">
							<li className="flex justify-between">
								<span className="text-muted-foreground">Người dùng</span>
								<span className="font-semibold">
									{localTenant.counts.users}
								</span>
							</li>
							<li className="flex justify-between">
								<span className="text-muted-foreground">Gói đăng ký</span>
								<span className="font-semibold">
									{localTenant.counts.subscriptions}
								</span>
							</li>
							<li className="flex justify-between">
								<span className="text-muted-foreground">Ticket mở</span>
								<span className="font-semibold">
									{localTenant.counts.openTickets}
								</span>
							</li>
						</ul>
						<p className="mt-3 text-[11px] text-muted-foreground">
							Cập nhật:{" "}
							{new Date(localTenant.updatedAt).toLocaleString("vi-VN")}
						</p>
					</div>

					<div className="rounded-[14px] border border-border bg-card p-4">
						<h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
							Vòng đời
						</h2>
						<p className="mt-2 text-xs text-muted-foreground">
							Chỉ đổi metadata trạng thái — không thu hồi session.
						</p>
						<label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Lý do (tuỳ chọn)
							<textarea
								value={reason}
								onChange={(e) => setReason(e.target.value.slice(0, 500))}
								rows={2}
								className="mt-1.5 w-full rounded-[10px] border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
							/>
						</label>
						<Can permission="admin.tenant:approve">
							<div className="mt-3 flex flex-wrap gap-2">
								{nextStatuses.includes("ACTIVE") ? (
									<button
										type="button"
										disabled={saving}
										onClick={() => requestTransition("ACTIVE")}
										className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#c8e6c9] bg-[#e8f5e9] px-3 py-1.5 text-xs font-semibold text-[#2e7d32] hover:bg-[#c8e6c9] disabled:opacity-50"
									>
										<CheckCircle2 className="size-3.5" aria-hidden />
										Kích hoạt
									</button>
								) : null}
								{nextStatuses.includes("SUSPENDED") ? (
									pendingTransition === "SUSPENDED" ? (
										<ConfirmTransitionButtons
											label="Tạm ngưng cửa hàng này?"
											confirmLabel="Tạm ngưng"
											saving={saving}
											onCancel={() => setPendingTransition(null)}
											onConfirm={() => requestTransition("SUSPENDED")}
										/>
									) : (
										<button
											type="button"
											disabled={saving}
											onClick={() => requestTransition("SUSPENDED")}
											className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#ffe082] bg-[#fff8e1] px-3 py-1.5 text-xs font-semibold text-[#f57f17] hover:bg-[#ffe082] disabled:opacity-50"
										>
											<Ban className="size-3.5" aria-hidden />
											Tạm ngưng
										</button>
									)
								) : null}
								{nextStatuses.includes("LOCKED") ? (
									pendingTransition === "LOCKED" ? (
										<ConfirmTransitionButtons
											label="Khóa cửa hàng này?"
											confirmLabel="Khóa"
											saving={saving}
											onCancel={() => setPendingTransition(null)}
											onConfirm={() => requestTransition("LOCKED")}
										/>
									) : (
										<button
											type="button"
											disabled={saving}
											onClick={() => requestTransition("LOCKED")}
											className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#ffcdd2] bg-[#ffebee] px-3 py-1.5 text-xs font-semibold text-[#c62828] hover:bg-[#ffcdd2] disabled:opacity-50"
										>
											<Lock className="size-3.5" aria-hidden />
											Khóa
										</button>
									)
								) : null}
							</div>
						</Can>
					</div>
				</section>
			</div>
			<SubscriptionPanel tenant={localTenant} />
		</div>
	);
}

/** Xác nhận inline 2 bước cho hành động nguy hiểm (DESIGN.md §21). */
function ConfirmTransitionButtons({
	label,
	confirmLabel,
	saving,
	onCancel,
	onConfirm,
}: {
	label: string;
	confirmLabel: string;
	saving: boolean;
	onCancel: () => void;
	onConfirm: () => void;
}) {
	return (
		<div className="flex items-center gap-2 rounded-[10px] border border-border bg-soft px-3 py-1.5 text-xs font-semibold">
			<span className="text-muted-foreground">{label}</span>
			<button
				type="button"
				aria-label="Hủy"
				disabled={saving}
				onClick={onCancel}
				className="inline-flex items-center gap-1 rounded-[8px] border border-border bg-card px-2 py-1 hover:bg-soft disabled:opacity-50"
			>
				<X className="size-3.5" aria-hidden />
				Hủy
			</button>
			<button
				type="button"
				aria-label={confirmLabel}
				disabled={saving}
				onClick={onConfirm}
				className="inline-flex items-center gap-1 rounded-[8px] bg-destructive px-2 py-1 text-white hover:bg-destructive/90 disabled:opacity-50"
			>
				<Check className="size-3.5" aria-hidden />
				{confirmLabel}
			</button>
		</div>
	);
}
