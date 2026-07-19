"use client";

import {
	AlertTriangle,
	CalendarDays,
	Check,
	LoaderCircle,
	RefreshCcw,
	X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
	type BillingCycle,
	listPlans,
	type PlanResponse,
} from "@/lib/admin-api/plans";
import {
	type AssignSubscriptionInput,
	assignSubscription,
	cancelSubscription,
	getSubscription,
	renewSubscription,
	type SubscriptionResponse,
	type SubscriptionResult,
} from "@/lib/admin-api/subscriptions";
import type { TenantDetail } from "@/lib/admin-api/tenants";
import { useAdminAuth } from "@/stores/admin-auth-store";
import { Can } from "./can-permission";

const CYCLE_LABEL: Record<BillingCycle, string> = {
	MONTHLY: "Theo tháng",
	QUARTERLY: "Theo quý",
	YEARLY: "Theo năm",
};

const STATUS_LABEL = {
	ACTIVE: "Đang hoạt động",
	TRIALING: "Đang dùng thử",
	CANCELLED: "Đã hủy",
	EXPIRED: "Đã hết hạn",
} as const;

type Props = { tenant: TenantDetail };

export function SubscriptionPanel({ tenant }: Props) {
	const accessToken = useAdminAuth((state) => state.accessToken);
	const canViewSubscription = useHasPermission("admin.subscription:view");
	const canViewPlans = useHasPermission("admin.plan:view");
	const [data, setData] = useState<SubscriptionResult | null>(null);
	const [plans, setPlans] = useState<PlanResponse[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [mode, setMode] = useState<"assign" | "renew" | "cancel" | null>(null);
	const [confirmCancel, setConfirmCancel] = useState(false);
	const [form, setForm] = useState<AssignSubscriptionInput>(() =>
		defaultForm(),
	);
	const [reference, setReference] = useState("");
	const [reason, setReason] = useState("");

	const load = useCallback(async () => {
		if (!accessToken || !canViewSubscription) return;
		setLoading(true);
		try {
			const [subscription, planResult] = await Promise.all([
				getSubscription(accessToken, tenant.id),
				canViewPlans
					? listPlans(accessToken)
					: Promise.resolve({ items: [] as PlanResponse[] }),
			]);
			setData(subscription);
			setPlans(planResult.items);
			setError(null);
		} catch (cause) {
			setError(
				(cause as Error).message || "Không tải được thông tin gói đăng ký",
			);
		} finally {
			setLoading(false);
		}
	}, [accessToken, canViewPlans, canViewSubscription, tenant.id]);

	useEffect(() => void load(), [load]);
	if (!canViewSubscription) return null;

	const current = data?.current ?? null;
	const currentPlan = plans.find((plan) => plan.id === current?.planId);
	const overages = currentPlan ? getOverages(currentPlan, tenant) : [];

	function beginAssign() {
		setMode("assign");
		setConfirmCancel(false);
		setError(null);
		setForm({
			...defaultForm(),
			planId: plans.find((plan) => plan.isActive)?.id ?? "",
		});
		setReference("");
		setReason("");
	}

	async function submitAssign(event: React.FormEvent) {
		event.preventDefault();
		if (!accessToken || !form.planId) return;
		if (form.endDate && form.endDate <= form.startDate) {
			setError("Ngày hết hạn phải sau ngày bắt đầu.");
			return;
		}
		setSaving(true);
		setError(null);
		try {
			await assignSubscription(accessToken, tenant.id, {
				...form,
				manualReference: reference.trim() || null,
				reason: reason.trim() || null,
				expectedUpdatedAt: current?.updatedAt ?? null,
			});
			setMode(null);
			await load();
		} catch (cause) {
			await showFailure(cause);
		} finally {
			setSaving(false);
		}
	}

	async function submitRenew() {
		if (!accessToken || !current) return;
		setSaving(true);
		setError(null);
		try {
			await renewSubscription(accessToken, tenant.id, {
				billingCycle: current.billingCycle,
				manualReference: reference.trim() || null,
				reason: reason.trim() || null,
				expectedUpdatedAt: current.updatedAt,
			});
			setMode(null);
			await load();
		} catch (cause) {
			await showFailure(cause);
		} finally {
			setSaving(false);
		}
	}

	async function submitCancel() {
		if (!accessToken || !current || !reason.trim()) {
			setError("Vui lòng nhập lý do hủy gói.");
			return;
		}
		setSaving(true);
		setError(null);
		try {
			await cancelSubscription(accessToken, tenant.id, {
				reason: reason.trim(),
				expectedUpdatedAt: current.updatedAt,
			});
			setMode(null);
			setConfirmCancel(false);
			await load();
		} catch (cause) {
			await showFailure(cause);
		} finally {
			setSaving(false);
		}
	}

	async function showFailure(cause: unknown) {
		const failure = cause as Error & { status?: number };
		setError(
			failure.status === 409
				? "Dữ liệu vừa thay đổi. Đã tải lại nguồn, vui lòng kiểm tra và thử lại."
				: failure.message || "Thao tác gói đăng ký không thành công",
		);
		if (failure.status === 409) await load();
	}

	return (
		<section
			className="space-y-4 rounded-[14px] border border-border bg-card p-4 lg:p-5"
			aria-labelledby="subscription-heading"
		>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2
						id="subscription-heading"
						className="text-sm font-bold uppercase tracking-wide text-muted-foreground"
					>
						Gói đăng ký
					</h2>
					<p className="mt-1 text-xs text-muted-foreground">
						Nguồn dữ liệu từ billing API, cập nhật sau mỗi thao tác.
					</p>
				</div>
				<button
					type="button"
					onClick={() => void load()}
					className="inline-flex h-12 items-center gap-2 rounded-[10px] border border-border px-4 text-sm font-semibold hover:bg-soft"
					aria-label="Làm mới gói đăng ký"
				>
					<RefreshCcw className="size-4" aria-hidden /> Làm mới
				</button>
			</div>
			{error ? (
				<div
					role="alert"
					className="rounded-[10px] border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
				>
					{error}
				</div>
			) : null}
			{loading ? (
				<p className="py-6 text-sm text-muted-foreground">
					Đang tải gói đăng ký…
				</p>
			) : current ? (
				<CurrentSubscription
					subscription={current}
					plan={currentPlan}
					overages={overages}
				/>
			) : (
				<EmptySubscription />
			)}
			<Can permission="admin.subscription:edit">
				<ActionBar
					current={current}
					mode={mode}
					setMode={setMode}
					beginAssign={beginAssign}
					canViewPlans={canViewPlans}
					setConfirmCancel={setConfirmCancel}
					setReference={setReference}
					setReason={setReason}
				/>
			</Can>
			{mode === "assign" ? (
				<AssignForm
					form={form}
					setForm={setForm}
					plans={plans}
					reference={reference}
					reason={reason}
					setReference={setReference}
					setReason={setReason}
					saving={saving}
					onSubmit={submitAssign}
					onCancel={() => setMode(null)}
				/>
			) : null}
			{mode === "renew" && current ? (
				<ReasonForm
					title="Gia hạn gói"
					reference={reference}
					reason={reason}
					setReference={setReference}
					setReason={setReason}
					saving={saving}
					onSubmit={() => void submitRenew()}
					onCancel={() => setMode(null)}
				/>
			) : null}
			{mode === "cancel" && current ? (
				<ReasonForm
					title="Hủy gói đăng ký"
					reference={reference}
					reason={reason}
					setReference={setReference}
					setReason={setReason}
					saving={saving}
					onSubmit={() => void submitCancel()}
					onCancel={() => {
						setMode(null);
						setConfirmCancel(false);
					}}
					requiredReason
					warning={!confirmCancel}
					onConfirm={() => setConfirmCancel(true)}
				/>
			) : null}
			<History rows={data?.history ?? []} />
		</section>
	);
}

function defaultForm(): AssignSubscriptionInput {
	return {
		planId: "",
		status: "ACTIVE",
		billingCycle: "MONTHLY",
		startDate: new Date().toISOString().slice(0, 10),
		endDate: addCycleDate(new Date(), "MONTHLY"),
	};
}

function addCycleDate(date: Date, cycle: BillingCycle) {
	const result = new Date(date);
	result.setUTCMonth(
		result.getUTCMonth() +
			(cycle === "YEARLY" ? 12 : cycle === "QUARTERLY" ? 3 : 1),
	);
	return result.toISOString().slice(0, 10);
}

function CurrentSubscription({
	subscription,
	plan,
	overages,
}: {
	subscription: SubscriptionResponse;
	plan?: PlanResponse;
	overages: string[];
}) {
	return (
		<div className="rounded-[12px] border border-border bg-soft p-4">
			<div className="flex flex-wrap items-center gap-2">
				<strong>{subscription.plan.name}</strong>
				<span className="rounded-full bg-[#e8f5e9] px-2.5 py-1 text-xs font-semibold text-[#2e7d32]">
					{STATUS_LABEL[subscription.status]}
				</span>
				{subscription.endDate && new Date(subscription.endDate) < new Date() ? (
					<span className="rounded-full bg-[#ffebee] px-2.5 py-1 text-xs font-semibold text-[#c62828]">
						Đã hết hạn
					</span>
				) : null}
				{overages.length ? (
					<span className="inline-flex items-center gap-1 rounded-full bg-[#fff8e1] px-2.5 py-1 text-xs font-semibold text-[#f57f17]">
						<AlertTriangle className="size-3" aria-hidden /> Vượt hạn:{" "}
						{overages.join(", ")}
					</span>
				) : null}
			</div>
			<p className="mt-2 text-sm text-muted-foreground">
				{subscription.plan.code} · {CYCLE_LABEL[subscription.billingCycle]} ·
				Hết hạn:{" "}
				{subscription.endDate
					? formatDate(subscription.endDate)
					: "Không xác định"}
			</p>
			<div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
				<span>Tham chiếu: {subscription.manualReference || "—"}</span>
				<span>Lý do: {subscription.reason || "—"}</span>
			</div>
			{plan ? (
				<div className="mt-3 flex flex-wrap gap-2">
					{Object.entries(plan.quotas).map(([key, value]) => (
						<span
							key={key}
							className="rounded-full bg-white px-2.5 py-1 text-xs font-medium"
						>
							{quotaLabel(key)}: {value === null ? "∞" : String(value)}
						</span>
					))}
					{plan.featureCodes.map((code) => (
						<span
							key={code}
							className="rounded-full bg-[#e3f2fd] px-2.5 py-1 text-xs font-medium text-[#1565c0]"
						>
							{code}
						</span>
					))}
				</div>
			) : null}
		</div>
	);
}

function getOverages(plan: PlanResponse, tenant: TenantDetail) {
	const usage = tenant.quotaUsage;
	const checks: Array<[string, number | string, number | string | null]> = [
		["user", usage.users, plan.quotas.maxUsers],
		["kho", usage.warehouses, plan.quotas.maxWarehouses],
		["sản phẩm", usage.products, plan.quotas.maxProducts],
		["khách hàng", usage.customers, plan.quotas.maxCustomers],
		["đơn/tháng", usage.ordersThisMonth, plan.quotas.maxOrdersPerMonth],
		["dung lượng", usage.storageBytes, plan.quotas.maxStorageBytes],
	];
	return checks
		.filter(([, used, limit]) => limit !== null && BigInt(used) > BigInt(limit))
		.map(([label]) => label);
}

function EmptySubscription() {
	return (
		<div className="rounded-[12px] border border-dashed border-border p-5 text-sm text-muted-foreground">
			Tenant chưa có gói đăng ký hiệu lực.
		</div>
	);
}

function ActionBar({
	current,
	mode,
	setMode,
	beginAssign,
	canViewPlans,
	setConfirmCancel,
	setReference,
	setReason,
}: {
	current: SubscriptionResponse | null;
	mode: string | null;
	setMode: (mode: "assign" | "renew" | "cancel" | null) => void;
	beginAssign: () => void;
	canViewPlans: boolean;
	setConfirmCancel: (value: boolean) => void;
	setReference: (value: string) => void;
	setReason: (value: string) => void;
}) {
	return (
		<div className="flex flex-wrap gap-2">
			{canViewPlans ? (
				<button
					type="button"
					onClick={beginAssign}
					className="inline-flex h-12 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover"
				>
					<Check className="size-4" aria-hidden />{" "}
					{current ? "Đổi gói" : "Gán gói"}
				</button>
			) : null}
			{current ? (
				<>
					<button
						type="button"
						onClick={() => {
							setMode("renew");
							setConfirmCancel(false);
							setReference("");
							setReason("");
						}}
						className="h-12 rounded-[10px] border border-border px-4 text-sm font-semibold hover:bg-soft"
					>
						Gia hạn
					</button>
					{current.status !== "CANCELLED" && current.status !== "EXPIRED" ? (
						<button
							type="button"
							onClick={() => {
								setMode("cancel");
								setConfirmCancel(false);
								setReason("");
							}}
							className="inline-flex h-12 items-center gap-2 rounded-[10px] border border-[#ffcdd2] px-4 text-sm font-semibold text-[#c62828] hover:bg-[#ffebee]"
						>
							<X className="size-4" aria-hidden /> Hủy gói
						</button>
					) : null}
				</>
			) : null}
			{mode ? <span className="sr-only">Đang mở biểu mẫu thao tác</span> : null}
		</div>
	);
}

function AssignForm({
	form,
	setForm,
	plans,
	reference,
	reason,
	setReference,
	setReason,
	saving,
	onSubmit,
	onCancel,
}: {
	form: AssignSubscriptionInput;
	setForm: (value: AssignSubscriptionInput) => void;
	plans: PlanResponse[];
	reference: string;
	reason: string;
	setReference: (value: string) => void;
	setReason: (value: string) => void;
	saving: boolean;
	onSubmit: (event: React.FormEvent) => void;
	onCancel: () => void;
}) {
	return (
		<form
			onSubmit={onSubmit}
			className="grid gap-3 rounded-[12px] border border-border p-4 sm:grid-cols-2"
		>
			<label className="text-sm font-semibold">
				Gói
				<select
					required
					value={form.planId}
					onChange={(e) => setForm({ ...form, planId: e.target.value })}
					className="mt-1.5 h-12 w-full rounded-[10px] border border-border bg-white px-3"
				>
					<option value="">Chọn gói</option>
					{plans
						.filter((plan) => plan.isActive)
						.map((plan) => (
							<option key={plan.id} value={plan.id}>
								{plan.name} ({plan.code})
							</option>
						))}
				</select>
			</label>
			<label className="text-sm font-semibold">
				Trạng thái
				<select
					value={form.status}
					onChange={(e) =>
						setForm({
							...form,
							status: e.target.value as "ACTIVE" | "TRIALING",
						})
					}
					className="mt-1.5 h-12 w-full rounded-[10px] border border-border bg-white px-3"
				>
					<option value="ACTIVE">Hoạt động</option>
					<option value="TRIALING">Dùng thử</option>
				</select>
			</label>
			<label className="text-sm font-semibold">
				Chu kỳ
				<select
					value={form.billingCycle}
					onChange={(e) =>
						setForm({ ...form, billingCycle: e.target.value as BillingCycle })
					}
					className="mt-1.5 h-12 w-full rounded-[10px] border border-border bg-white px-3"
				>
					<option value="MONTHLY">{CYCLE_LABEL.MONTHLY}</option>
					<option value="QUARTERLY">{CYCLE_LABEL.QUARTERLY}</option>
					<option value="YEARLY">{CYCLE_LABEL.YEARLY}</option>
				</select>
			</label>
			<label className="text-sm font-semibold">
				Bắt đầu
				<input
					required
					type="date"
					value={form.startDate}
					onChange={(e) => setForm({ ...form, startDate: e.target.value })}
					className="mt-1.5 h-12 w-full rounded-[10px] border border-border bg-white px-3"
				/>
			</label>
			<label className="text-sm font-semibold">
				Ngày hết hạn
				<input
					required
					type="date"
					value={form.endDate ?? ""}
					onChange={(e) => setForm({ ...form, endDate: e.target.value })}
					className="mt-1.5 h-12 w-full rounded-[10px] border border-border bg-white px-3"
				/>
			</label>
			<TextField
				label="Tham chiếu thủ công"
				value={reference}
				onChange={setReference}
			/>
			<TextField label="Lý do" value={reason} onChange={setReason} />
			<FormButtons saving={saving} onCancel={onCancel} />
		</form>
	);
}

function ReasonForm({
	title,
	reference,
	reason,
	setReference,
	setReason,
	saving,
	onSubmit,
	onCancel,
	requiredReason = false,
	warning = false,
	onConfirm,
}: {
	title: string;
	reference: string;
	reason: string;
	setReference: (value: string) => void;
	setReason: (value: string) => void;
	saving: boolean;
	onSubmit: () => void;
	onCancel: () => void;
	requiredReason?: boolean;
	warning?: boolean;
	onConfirm?: () => void;
}) {
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				if (requiredReason && warning) {
					// First submit is an explicit confirmation step for cancellation.
					onConfirm?.();
					return;
				}
				onSubmit();
			}}
			className="rounded-[12px] border border-[#ffcdd2] p-4"
		>
			<h3 className="font-semibold">{title}</h3>
			{warning ? (
				<p className="mt-1 text-sm text-[#c62828]">
					Thao tác này cần xác nhận và không xóa dữ liệu tenant.
				</p>
			) : null}
			<div className="mt-3 grid gap-3 sm:grid-cols-2">
				<TextField
					label="Tham chiếu thủ công"
					value={reference}
					onChange={setReference}
				/>
				<TextField
					label={requiredReason ? "Lý do bắt buộc" : "Lý do"}
					value={reason}
					onChange={setReason}
					required={requiredReason}
				/>
			</div>
			<FormButtons
				saving={saving}
				onCancel={onCancel}
				confirm={requiredReason && warning}
			/>
		</form>
	);
}

function TextField({
	label,
	value,
	onChange,
	required = false,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	required?: boolean;
}) {
	return (
		<label className="text-sm font-semibold">
			{label}
			<input
				required={required}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				maxLength={500}
				className="mt-1.5 h-12 w-full rounded-[10px] border border-border bg-white px-3"
			/>
		</label>
	);
}
function FormButtons({
	saving,
	onCancel,
	confirm,
}: {
	saving: boolean;
	onCancel: () => void;
	confirm?: boolean;
}) {
	return (
		<div className="flex flex-col-reverse gap-2 pt-1 sm:col-span-2 sm:flex-row sm:justify-end">
			<button
				type="button"
				onClick={onCancel}
				className="h-12 rounded-[10px] border border-border px-4 text-sm font-semibold"
			>
				Hủy
			</button>
			<button
				type="submit"
				disabled={saving}
				className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-semibold text-white disabled:opacity-60"
			>
				{saving ? (
					<LoaderCircle className="size-4 animate-spin" aria-hidden />
				) : (
					<CalendarDays className="size-4" aria-hidden />
				)}{" "}
				{confirm ? "Xác nhận" : "Lưu"}
			</button>
		</div>
	);
}
function History({ rows }: { rows: SubscriptionResponse[] }) {
	return (
		<details className="rounded-[12px] border border-border p-4">
			<summary className="cursor-pointer text-sm font-semibold">
				Lịch sử gói ({rows.length})
			</summary>
			<div className="mt-3 space-y-2">
				{rows.map((row) => (
					<div key={row.id} className="rounded-[10px] bg-soft p-3 text-sm">
						<div className="flex flex-wrap justify-between gap-2">
							<strong>{row.plan.name}</strong>
							<span>{STATUS_LABEL[row.status]}</span>
						</div>
						<p className="mt-1 text-xs text-muted-foreground">
							{formatDate(row.startDate)} —{" "}
							{row.endDate ? formatDate(row.endDate) : "Không xác định"} · cập
							nhật {formatDate(row.updatedAt)}
						</p>
					</div>
				))}
			</div>
		</details>
	);
}
function formatDate(value: string) {
	return new Date(value).toLocaleDateString("vi-VN");
}
function quotaLabel(key: string) {
	return (
		(
			{
				maxUsers: "User",
				maxWarehouses: "Kho",
				maxProducts: "SP",
				maxCustomers: "KH",
				maxOrdersPerMonth: "Đơn/tháng",
				maxStorageBytes: "Dung lượng",
			} as Record<string, string>
		)[key] ?? key
	);
}
