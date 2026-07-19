"use client";

import { ChevronDown, Edit3, Layers3, Plus, RefreshCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Can } from "@/components/admin/can-permission";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
	type BillingCycle,
	listPlans,
	type PlanResponse,
	setPlanActivation,
} from "@/lib/admin-api/plans";
import { useAdminAuth } from "@/stores/admin-auth-store";

const CYCLE_LABEL: Record<BillingCycle, string> = {
	MONTHLY: "Theo tháng",
	QUARTERLY: "Theo quý",
	YEARLY: "Theo năm",
};

export function PlanCatalog() {
	const router = useRouter();
	const accessToken = useAdminAuth((state) => state.accessToken);
	const canEdit = useHasPermission("admin.plan:edit");
	const [plans, setPlans] = useState<PlanResponse[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [confirmId, setConfirmId] = useState<string | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const load = useCallback(async () => {
		if (!accessToken) return;
		setLoading(true);
		try {
			const result = await listPlans(accessToken);
			setPlans(result.items);
			setError(null);
		} catch (cause) {
			setError((cause as Error).message || "Không tải được danh sách gói");
		} finally {
			setLoading(false);
		}
	}, [accessToken]);

	useEffect(() => void load(), [load]);

	const activeCount = useMemo(
		() => plans.filter((plan) => plan.isActive).length,
		[plans],
	);

	async function toggle(plan: PlanResponse) {
		if (!accessToken) return;
		if (plan.isActive && confirmId !== plan.id) {
			setConfirmId(plan.id);
			return;
		}
		setSaving(true);
		setError(null);
		try {
			await setPlanActivation(accessToken, plan.id, {
				isActive: !plan.isActive,
				expectedUpdatedAt: plan.updatedAt,
			});
			setConfirmId(null);
			await load();
		} catch (cause) {
			const failure = cause as Error & { status?: number };
			setError(
				failure.status === 409
					? "Gói vừa được cập nhật bởi người khác. Danh sách đã được tải lại."
					: failure.message || "Không đổi được trạng thái gói",
			);
			if (failure.status === 409) await load();
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="space-y-5 pb-8">
			<header className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-[22px] font-bold tracking-tight text-foreground">
							Gói dịch vụ
						</h1>
						<span className="rounded-full bg-[#ede7f6] px-2.5 py-1 text-xs font-bold text-[#5e35b1]">
							{activeCount} đang bật
						</span>
					</div>
					<p className="mt-1 text-sm text-muted-foreground">
						Quản lý tính năng và hạn mức cho các cửa hàng
					</p>
				</div>
				<div className="flex w-full gap-2 sm:w-auto">
					<button
						type="button"
						onClick={() => void load()}
						className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[10px] border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-soft sm:flex-none"
						aria-label="Làm mới danh sách gói"
					>
						<RefreshCcw className="size-4" aria-hidden /> Làm mới
					</button>
					<Can permission="admin.plan:edit">
						<button
							type="button"
							onClick={() => router.push("/admin/plans/new")}
							className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-bold text-white hover:bg-primary-hover sm:flex-none"
						>
							<Plus className="size-4" aria-hidden /> Thêm gói
						</button>
					</Can>
				</div>
			</header>

			{error ? (
				<div
					role="alert"
					className="rounded-[10px] border border-[#ef9a9a] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b3261e]"
				>
					{error}
				</div>
			) : null}
			<section aria-label="Danh sách gói dịch vụ" className="space-y-3">
				{loading ? (
					<div className="rounded-[14px] border border-border bg-card p-8 text-center text-sm text-muted-foreground">
						Đang tải danh sách gói…
					</div>
				) : plans.length === 0 ? (
					<div className="rounded-[14px] border border-dashed border-border bg-card p-10 text-center">
						<Layers3 className="mx-auto size-8 text-[#7e57c2]" aria-hidden />
						<p className="mt-3 font-semibold">Chưa có gói dịch vụ</p>
						<p className="mt-1 text-sm text-muted-foreground">
							Tạo gói đầu tiên để bắt đầu cấu hình tính năng.
						</p>
					</div>
				) : (
					plans.map((plan) => (
						<PlanRow
							key={plan.id}
							plan={plan}
							expanded={expandedId === plan.id}
							confirm={confirmId === plan.id}
							busy={saving}
							canEdit={canEdit}
							onExpand={() =>
								setExpandedId(expandedId === plan.id ? null : plan.id)
							}
							onEdit={() => router.push(`/admin/plans/${plan.id}/edit`)}
							onToggle={() => void toggle(plan)}
							onCancelConfirm={() => setConfirmId(null)}
						/>
					))
				)}
			</section>
		</div>
	);
}

function PlanRow({
	plan,
	expanded,
	confirm,
	busy,
	canEdit,
	onExpand,
	onEdit,
	onToggle,
	onCancelConfirm,
}: {
	plan: PlanResponse;
	expanded: boolean;
	confirm: boolean;
	busy: boolean;
	canEdit: boolean;
	onExpand: () => void;
	onEdit: () => void;
	onToggle: () => void;
	onCancelConfirm: () => void;
}) {
	return (
		<article className="rounded-[14px] border border-border bg-card p-4 shadow-sm sm:p-5">
			<button
				type="button"
				onClick={onExpand}
				className="group flex w-full cursor-pointer items-start gap-3 rounded-[10px] text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
			>
				<div className="flex size-11 shrink-0 items-center justify-center rounded-[10px] bg-[#ede7f6] text-[#7e57c2]">
					<Layers3 className="size-5" aria-hidden />
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<h2 className="truncate text-base font-bold">{plan.name}</h2>
						<span
							className={`rounded-full px-2 py-1 text-xs font-bold ${plan.isActive ? "bg-[#e8f5e9] text-[#2e7d32]" : "bg-[#f5f5f5] text-[#616161]"}`}
						>
							{plan.isActive ? "Đang bật" : "Đang tắt"}
						</span>
					</div>
					<p className="mt-1 text-sm text-muted-foreground">
						<code className="rounded bg-soft px-1.5 py-0.5 text-xs">
							{plan.code}
						</code>{" "}
						· {formatMoney(plan.price)} · {CYCLE_LABEL[plan.billingCycle]}
					</p>
				</div>
				<span
					className="flex size-12 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground group-hover:bg-soft"
					aria-hidden
				>
					<ChevronDown
						className={`size-5 transition-transform ${expanded ? "rotate-180" : ""}`}
					/>
				</span>
			</button>
			{expanded ? (
				<div className="mt-4 border-t border-border pt-4">
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
						<Quota label="Người dùng" value={plan.quotas.maxUsers} />
						<Quota label="Kho" value={plan.quotas.maxWarehouses} />
						<Quota label="Sản phẩm" value={plan.quotas.maxProducts} />
						<Quota label="Khách hàng" value={plan.quotas.maxCustomers} />
						<Quota label="Đơn/tháng" value={plan.quotas.maxOrdersPerMonth} />
						<Quota
							label="Dung lượng"
							value={`${plan.quotas.maxStorageBytes} bytes`}
						/>
					</div>
					<div className="mt-4 flex flex-wrap gap-2">
						{plan.featureCodes.map((code) => (
							<span
								key={code}
								className="rounded-full bg-[#e3f2fd] px-2.5 py-1 text-xs font-medium text-[#1565c0]"
							>
								{code}
							</span>
						))}
					</div>
					{canEdit ? (
						<div className="mt-4 flex flex-wrap gap-2">
							{confirm ? (
								<>
									<span className="flex items-center text-sm text-[#b3261e]">
										Tắt gói này?
									</span>
									<button
										type="button"
										onClick={onToggle}
										disabled={busy}
										className="h-12 rounded-[10px] bg-[#c62828] px-4 text-sm font-semibold text-white disabled:opacity-60"
									>
										Xác nhận tắt
									</button>
									<button
										type="button"
										onClick={onCancelConfirm}
										className="h-12 rounded-[10px] border border-border px-4 text-sm font-semibold"
									>
										Hủy
									</button>
								</>
							) : (
								<>
									<button
										type="button"
										onClick={onEdit}
										className="inline-flex h-12 items-center gap-2 rounded-[10px] border border-border px-4 text-sm font-semibold hover:bg-soft"
									>
										<Edit3 className="size-4" aria-hidden /> Chỉnh sửa
									</button>
									<button
										type="button"
										onClick={onToggle}
										disabled={busy}
										className="h-12 rounded-[10px] border border-border px-4 text-sm font-semibold disabled:opacity-60"
									>
										{plan.isActive ? "Tắt gói" : "Bật gói"}
									</button>
								</>
							)}
						</div>
					) : null}
				</div>
			) : null}
		</article>
	);
}

function Quota({
	label,
	value,
}: {
	label: string;
	value: number | string | null;
}) {
	return (
		<div className="rounded-[10px] bg-soft p-3">
			<p className="text-xs text-muted-foreground">{label}</p>
			<p className="mt-1 text-sm font-bold">
				{value === null ? "Không giới hạn" : value}
			</p>
		</div>
	);
}

function formatMoney(value: string) {
	return `${new Intl.NumberFormat("vi-VN").format(Number(value))}đ`;
}
