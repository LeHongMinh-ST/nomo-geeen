"use client";

import { Info } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { SettingHeader } from "@/components/app/setting-header";
import {
	BUSINESS_GROUP_CATALOG,
	type BusinessGroupId,
	resolveEnabledBusinessGroups,
} from "@/lib/product-kind-form";
import {
	getTenantBusinessGroups,
	updateTenantBusinessGroups,
} from "@/lib/tenant-products-api";
import { useUserAuth } from "@/stores/user-auth-store";

/**
 * Bật/tắt nhóm kinh doanh của cửa hàng (docs/core-business-catalog.md §3).
 * Mobile-first theo DESIGN.md §5, §7, §9.
 */

type ApiError = Error & { reason?: string; status?: number };

const ALL_OFF_HINT =
	"Phải bật ít nhất một nhóm. Nếu tắt hết, cửa hàng sẽ không tạo được sản phẩm nào.";

function errorMessage(error: unknown): string {
	const { reason, status } = error as ApiError;
	if (reason === "NO_ENABLED_BUSINESS_GROUP") return ALL_OFF_HINT;
	if (status === 403) return "Bạn không có quyền thay đổi nhóm kinh doanh.";
	if (status === 401) return "Phiên đăng nhập đã hết hạn.";
	return error instanceof Error ? error.message : "Không thể lưu thay đổi.";
}

export function BusinessGroupSettings() {
	const user = useUserAuth((state) => state.user);
	const canView = Boolean(user?.permissions.includes("product:view"));
	const canEdit = Boolean(user?.permissions.includes("product:edit"));
	const [enabled, setEnabled] = useState<Set<BusinessGroupId>>(new Set());
	const [available, setAvailable] = useState<Set<BusinessGroupId>>(new Set());
	const [counts, setCounts] = useState<Record<string, number>>({});
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [saved, setSaved] = useState(false);

	const apply = useCallback(
		(result: Awaited<ReturnType<typeof getTenantBusinessGroups>>) => {
			// Chưa cấu hình lần nào = coi như đang bật tất cả, đúng với
			// resolveEnabledBusinessGroups mà form sản phẩm đang dùng.
			setEnabled(
				new Set(
					resolveEnabledBusinessGroups(result.configured, result.groups).map(
						(group) => group.id,
					),
				),
			);
			setAvailable(
				new Set(
					result.configured
						? result.groups
								.filter((group) => group.available !== false)
								.map((group) => group.businessGroup as BusinessGroupId)
						: ["CROP_INPUTS" as BusinessGroupId],
				),
			);
			setCounts(result.productCounts ?? {});
		},
		[],
	);

	const load = useCallback(async () => {
		if (!canView) {
			setLoading(false);
			return;
		}
		setLoading(true);
		setError("");
		try {
			apply(await getTenantBusinessGroups());
		} catch (cause) {
			setError(errorMessage(cause));
		} finally {
			setLoading(false);
		}
	}, [apply, canView]);

	useEffect(() => {
		void load();
	}, [load]);

	if (!canView)
		return (
			<div className="mx-auto flex w-full max-w-2xl flex-col gap-6 lg:mx-0">
				<SettingHeader title="Nhóm kinh doanh" />
				<p className="rounded-[16px] border border-border bg-card p-6 text-base text-[#616161]">
					Bạn không có quyền xem nhóm kinh doanh của cửa hàng.
				</p>
			</div>
		);

	const allOff = enabled.size === 0;

	function toggle(id: BusinessGroupId) {
		if (!available.has(id)) return;
		setEnabled((current) => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
		setSaved(false);
		setError("");
	}

	async function save() {
		if (allOff || !canEdit) return;
		setSaving(true);
		setError("");
		setSaved(false);
		try {
			apply(await updateTenantBusinessGroups([...enabled]));
			setSaved(true);
		} catch (cause) {
			setError(errorMessage(cause));
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-6 lg:mx-0">
			<SettingHeader
				title="Nhóm kinh doanh"
				description="Nhóm hàng được mở tự động theo gói dịch vụ của cửa hàng."
			/>

			{/* Hệ quả của việc tắt nhóm — catalog §3 */}
			<div className="flex gap-3 rounded-[16px] border border-[#e6a817]/60 bg-[#fff8e1] p-4">
				<Info className="mt-0.5 size-5 shrink-0 text-[#9a6800]" aria-hidden />
				<div className="flex flex-col gap-1 text-sm text-[#6b5300]">
					<p className="text-base font-semibold text-[#9a6800]">
						Gói dịch vụ quyết định nhóm hàng
					</p>
					<p>
						Tắt một nhóm chỉ ngăn tạo sản phẩm mới và thêm dòng bán hàng mới
						thuộc nhóm đó.
					</p>
					<p>
						Sản phẩm, tồn kho, chứng từ, Sổ tay và lịch sử đã có vẫn giữ nguyên,
						không bị xóa. Bật lại nhóm là dùng tiếp được ngay.
					</p>
				</div>
			</div>

			{loading ? (
				<p role="status" className="py-8 text-center text-base text-[#616161]">
					Đang tải nhóm kinh doanh…
				</p>
			) : (
				<div className="overflow-hidden rounded-[16px] border border-border bg-card shadow-card">
					{BUSINESS_GROUP_CATALOG.map((group) => {
						const on = enabled.has(group.id);
						const purchasable = available.has(group.id);
						const count = counts[group.id] ?? 0;
						return (
							<div
								key={group.id}
								className="flex items-center gap-3 border-b border-border p-4 last:border-b-0"
							>
								<div className="flex min-w-0 flex-1 flex-col">
									<span className="text-base font-medium text-foreground">
										{group.label}
									</span>
									<span className="text-sm text-[#616161]">
										{!purchasable
											? "Chưa có trong gói dịch vụ"
											: count > 0
											? `Đang có ${count} sản phẩm`
											: "Chưa có sản phẩm nào"}
									</span>
								</div>
								<button
									type="button"
									role="switch"
									aria-checked={on}
									aria-label={group.label}
										disabled={!canEdit || saving || !purchasable}
									onClick={() => toggle(group.id)}
									className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ease-out disabled:opacity-50 ${
										on ? "bg-primary" : "bg-[#e0e0e0]"
									}`}
								>
									<span
										className={`absolute top-1 size-5 rounded-full bg-white transition-all duration-200 ease-out ${
											on ? "left-6" : "left-1"
										}`}
									/>
								</button>
							</div>
						);
					})}
				</div>
			)}

			{allOff && !loading ? (
				<p
					role="alert"
					className="rounded-[10px] border border-[#e6a817]/60 bg-[#fff8e1] px-4 py-3 text-sm text-[#9a6800]"
				>
					{ALL_OFF_HINT}
				</p>
			) : null}
			{error ? (
				<p
					role="alert"
					className="rounded-[10px] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
				>
					{error}
				</p>
			) : null}
			{saved ? (
				<p
					role="status"
					aria-live="polite"
					className="rounded-[10px] bg-[#e8f5e9] px-4 py-3 text-sm text-[#2e7d32]"
				>
					Đã lưu nhóm kinh doanh.
				</p>
			) : null}

			{canEdit ? (
				<button
					type="button"
					onClick={() => void save()}
					disabled={allOff || saving || loading}
					className="flex h-12 w-full items-center justify-center rounded-[10px] bg-primary text-base font-semibold text-white transition-all duration-200 ease-out hover:bg-[#5cad45] active:translate-y-px active:bg-[#3f8530] disabled:cursor-not-allowed disabled:opacity-50 md:h-11"
				>
					{saving ? "Đang lưu…" : "Lưu thay đổi"}
				</button>
			) : (
				<p className="text-sm text-[#616161]">
					Bạn chỉ có quyền xem. Liên hệ chủ cửa hàng để thay đổi.
				</p>
			)}
		</div>
	);
}
