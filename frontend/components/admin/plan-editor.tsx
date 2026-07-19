"use client";

import { ArrowLeft, Check, LoaderCircle } from "lucide-react";
import { cloneElement, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
	type BillingCycle,
	createPlan,
	listPlans,
	type PlanInput,
	type PlanResponse,
	updatePlan,
} from "@/lib/admin-api/plans";
import { useAdminAuth } from "@/stores/admin-auth-store";

const CYCLE_LABEL: Record<BillingCycle, string> = {
	MONTHLY: "Theo tháng",
	QUARTERLY: "Theo quý",
	YEARLY: "Theo năm",
};

const FEATURE_SUGGESTIONS = ["inventory", "debt", "handbook", "barcode"];

type FormState = {
	code: string;
	name: string;
	description: string;
	price: string;
	billingCycle: BillingCycle;
	maxUsers: string;
	maxWarehouses: string;
	maxProducts: string;
	maxCustomers: string;
	maxOrdersPerMonth: string;
	maxStorageBytes: string;
	featureCodes: string;
};

const EMPTY_FORM: FormState = {
	code: "",
	name: "",
	description: "",
	price: "0",
	billingCycle: "MONTHLY",
	maxUsers: "1",
	maxWarehouses: "1",
	maxProducts: "",
	maxCustomers: "",
	maxOrdersPerMonth: "",
	maxStorageBytes: "0",
	featureCodes: "",
};

function formFromPlan(plan: PlanResponse): FormState {
	return {
		code: plan.code,
		name: plan.name,
		description: plan.description ?? "",
		price: plan.price,
		billingCycle: plan.billingCycle,
		maxUsers: String(plan.quotas.maxUsers),
		maxWarehouses: String(plan.quotas.maxWarehouses),
		maxProducts:
			plan.quotas.maxProducts === null ? "" : String(plan.quotas.maxProducts),
		maxCustomers:
			plan.quotas.maxCustomers === null ? "" : String(plan.quotas.maxCustomers),
		maxOrdersPerMonth:
			plan.quotas.maxOrdersPerMonth === null
				? ""
				: String(plan.quotas.maxOrdersPerMonth),
		maxStorageBytes: plan.quotas.maxStorageBytes,
		featureCodes: plan.featureCodes.join(", "),
	};
}

function parseQuota(value: string, label: string, unlimited = false) {
	if (unlimited && !value.trim()) return null;
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed) || parsed < 0) {
		throw new Error(`${label} phải là số nguyên không âm`);
	}
	return parsed;
}

function parseRequiredQuota(value: string, label: string) {
	const parsed = parseQuota(value, label);
	if (parsed === null) throw new Error(`${label} là bắt buộc`);
	return parsed;
}

function toInput(form: FormState, editing: boolean): PlanInput {
	const input = {
		name: form.name.trim(),
		description: form.description.trim() || null,
		price: parseRequiredQuota(form.price, "Giá"),
		billingCycle: form.billingCycle,
		maxUsers: parseRequiredQuota(form.maxUsers, "Số người dùng"),
		maxWarehouses: parseRequiredQuota(form.maxWarehouses, "Số kho"),
		maxProducts: parseQuota(form.maxProducts, "Số sản phẩm", true),
		maxCustomers: parseQuota(form.maxCustomers, "Số khách hàng", true),
		maxOrdersPerMonth: parseQuota(form.maxOrdersPerMonth, "Số đơn/tháng", true),
		maxStorageBytes: parseRequiredQuota(form.maxStorageBytes, "Dung lượng"),
		featureCodes: [
			...new Set(
				form.featureCodes
					.split(",")
					.map((code) => code.trim())
					.filter(Boolean),
			),
		],
	};
	if (!input.name) throw new Error("Vui lòng nhập tên gói");
	if (!editing && !form.code.trim()) throw new Error("Vui lòng nhập mã gói");
	return editing ? input : { ...input, code: form.code.trim() };
}

export function PlanEditor({ planId }: { planId?: string }) {
	const accessToken = useAdminAuth((state) => state.accessToken);
	const allowed = useHasPermission("admin.plan:edit");
	const editing = Boolean(planId);
	const [plan, setPlan] = useState<PlanResponse | null>(null);
	const [form, setForm] = useState<FormState>(EMPTY_FORM);
	const [loading, setLoading] = useState(editing);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		if (!accessToken || !planId) return;
		setLoading(true);
		try {
			const result = await listPlans(accessToken);
			const found = result.items.find((item) => item.id === planId);
			if (!found) throw new Error("Không tìm thấy gói dịch vụ");
			setPlan(found);
			setForm(formFromPlan(found));
		} catch (cause) {
			setError((cause as Error).message);
		} finally {
			setLoading(false);
		}
	}, [accessToken, planId]);

	useEffect(() => void load(), [load]);

	async function submit(event: React.FormEvent) {
		event.preventDefault();
		if (!accessToken || (editing && !plan)) return;
		setSaving(true);
		setError(null);
		try {
			const input = toInput(form, editing);
			if (plan) {
				await updatePlan(accessToken, plan.id, {
					...input,
					expectedUpdatedAt: plan.updatedAt,
				});
			} else {
				await createPlan(accessToken, input);
			}
			window.location.href = "/admin/plans";
		} catch (cause) {
			const failure = cause as Error & { status?: number };
			setError(
				failure.status === 409
					? "Dữ liệu đã thay đổi. Vui lòng tải lại và thử lại."
					: failure.message || "Không lưu được gói",
			);
			if (failure.status === 409) await load();
		} finally {
			setSaving(false);
		}
	}

	if (!allowed) return null;
	if (loading)
		return (
			<p className="text-sm text-muted-foreground">Đang tải gói dịch vụ…</p>
		);

	return (
		<div className="max-w-4xl space-y-5 pb-8">
			<Link
				href="/admin/plans"
				className="inline-flex h-12 items-center gap-2 text-sm font-semibold text-primary hover:underline"
			>
				<ArrowLeft className="size-4" aria-hidden /> Quay lại danh sách gói
			</Link>
			<header>
				<p className="text-xs font-bold uppercase tracking-[0.12em] text-[#7e57c2]">
					{editing ? "Chỉnh sửa" : "Tạo mới"}
				</p>
				<h1 className="mt-1 text-[22px] font-bold">
					{editing ? plan?.name : "Thêm gói dịch vụ"}
				</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Cấu hình giá, hạn mức và tính năng cho cửa hàng.
				</p>
			</header>
			{error ? (
				<div
					role="alert"
					className="rounded-[10px] border border-[#ef9a9a] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#b3261e]"
				>
					{error}
				</div>
			) : null}
			<form
				onSubmit={(event) => void submit(event)}
				className="grid gap-4 rounded-[14px] border border-border bg-card p-4 shadow-sm sm:p-6 lg:grid-cols-2"
			>
				{!editing ? (
					<Field label="Mã gói" hint="Ví dụ: starter">
						<Input
							required
							value={form.code}
							onChange={(event) =>
								setForm({ ...form, code: event.target.value })
							}
							placeholder="starter"
						/>
					</Field>
				) : null}
				<Field label="Tên gói">
					<Input
						required
						value={form.name}
						onChange={(event) => setForm({ ...form, name: event.target.value })}
						placeholder="Gói khởi đầu"
					/>
				</Field>
				<Field label="Giá (VND)">
					<Input
						required
						type="number"
						min="0"
						step="1"
						value={form.price}
						onChange={(event) =>
							setForm({ ...form, price: event.target.value })
						}
					/>
				</Field>
				<Field label="Chu kỳ">
					<select
						value={form.billingCycle}
						onChange={(event) =>
							setForm({
								...form,
								billingCycle: event.target.value as BillingCycle,
							})
						}
						className="h-12 w-full rounded-[10px] border border-border bg-white px-3.5 text-base"
					>
						<option value="MONTHLY">{CYCLE_LABEL.MONTHLY}</option>
						<option value="QUARTERLY">{CYCLE_LABEL.QUARTERLY}</option>
						<option value="YEARLY">{CYCLE_LABEL.YEARLY}</option>
					</select>
				</Field>
				<Field label="Số người dùng">
					<Input
						required
						type="number"
						min="0"
						value={form.maxUsers}
						onChange={(event) =>
							setForm({ ...form, maxUsers: event.target.value })
						}
					/>
				</Field>
				<Field label="Số kho">
					<Input
						required
						type="number"
						min="0"
						value={form.maxWarehouses}
						onChange={(event) =>
							setForm({ ...form, maxWarehouses: event.target.value })
						}
					/>
				</Field>
				<Field label="Số sản phẩm" hint="Để trống = không giới hạn">
					<Input
						type="number"
						min="0"
						value={form.maxProducts}
						onChange={(event) =>
							setForm({ ...form, maxProducts: event.target.value })
						}
					/>
				</Field>
				<Field label="Số khách hàng" hint="Để trống = không giới hạn">
					<Input
						type="number"
						min="0"
						value={form.maxCustomers}
						onChange={(event) =>
							setForm({ ...form, maxCustomers: event.target.value })
						}
					/>
				</Field>
				<Field label="Số đơn mỗi tháng" hint="Để trống = không giới hạn">
					<Input
						type="number"
						min="0"
						value={form.maxOrdersPerMonth}
						onChange={(event) =>
							setForm({ ...form, maxOrdersPerMonth: event.target.value })
						}
					/>
				</Field>
				<Field label="Dung lượng (bytes)">
					<Input
						required
						type="number"
						min="0"
						value={form.maxStorageBytes}
						onChange={(event) =>
							setForm({ ...form, maxStorageBytes: event.target.value })
						}
					/>
				</Field>
				<Field
					label="Mã tính năng"
					hint={`Gợi ý: ${FEATURE_SUGGESTIONS.join(", ")}`}
				>
					<Input
						value={form.featureCodes}
						onChange={(event) =>
							setForm({ ...form, featureCodes: event.target.value })
						}
						placeholder="inventory, debt"
					/>
				</Field>
				<label className="lg:col-span-2">
					<span className="mb-1.5 block text-sm font-semibold">Mô tả</span>
					<textarea
						value={form.description}
						onChange={(event) =>
							setForm({ ...form, description: event.target.value })
						}
						maxLength={2000}
						rows={3}
						className="w-full rounded-[10px] border border-border bg-white px-3.5 py-3 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
					/>
				</label>
				<div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end lg:col-span-2">
					<Link
						href="/admin/plans"
						className="inline-flex h-12 items-center justify-center rounded-[10px] border border-border px-5 text-sm font-semibold hover:bg-soft"
					>
						Hủy
					</Link>
					<button
						type="submit"
						disabled={saving}
						className="inline-flex h-12 items-center justify-center gap-2 rounded-[10px] bg-primary px-5 text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-60"
					>
						{saving ? (
							<LoaderCircle className="size-4 animate-spin" aria-hidden />
						) : (
							<Check className="size-4" aria-hidden />
						)}
						{saving ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Tạo gói"}
					</button>
				</div>
			</form>
		</div>
	);
}

function Field({
	label,
	hint,
	children,
}: {
	label: string;
	hint?: string;
	children: React.ReactElement<{ id?: string }>;
}) {
	const id = `${label.replace(/\s+/g, "-").toLowerCase()}`;
	return (
		<div>
			<label className="mb-1.5 block text-sm font-semibold" htmlFor={id}>
				{label}
			</label>
			{cloneElement(children, { id })}
			{hint ? (
				<span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
			) : null}
		</div>
	);
}
