"use client";

import { Check, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
	AREA_UNIT_OPTIONS,
	type AreaUnitId,
	type QuickProtocol,
	type QuickProtocolItem,
} from "@/lib/tenant-handbook-api";

const STATUS_BADGE: Record<
	QuickProtocol["status"],
	{ label: string; className: string }
> = {
	FULL: { label: "Đủ hàng", className: "bg-[#e8f5e9] text-[#2e7d32]" },
	PARTIAL: { label: "Thiếu một phần", className: "bg-[#fff8e1] text-[#ef6c00]" },
	OUT: { label: "Hết hàng", className: "bg-[#ffebee] text-[#c62828]" },
};

function formatNumber(value: number): string {
	return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 }).format(
		value,
	);
}

/** Human-readable dose line: "75 ml → 2 chai" or the reason packs are unknown. */
function quantityLabel(item: QuickProtocolItem): string {
	if (item.needAmount === null) return "Nhập diện tích để tính lượng cần";
	const need = `${formatNumber(item.needAmount)} ${item.needUnit}`;
	if (item.packs !== null) {
		return `${need} → ${item.packs} ${item.unit ?? "đơn vị"}`;
	}
	return `${need} · chưa quy đổi được số lượng bán`;
}

export function ProtocolPicker({
	protocols,
	area,
	onAreaChange,
	onConfirm,
}: {
	protocols: QuickProtocol[];
	area: { value: string; unit: AreaUnitId };
	onAreaChange: (area: { value: string; unit: AreaUnitId }) => void;
	onConfirm: (protocol: QuickProtocol, items: QuickProtocolItem[]) => void;
}) {
	const [activeId, setActiveId] = useState<string | null>(null);
	const [checked, setChecked] = useState<Record<string, boolean>>({});

	const active = useMemo(
		() => protocols.find((p) => p.id === activeId) ?? protocols[0] ?? null,
		[protocols, activeId],
	);

	// Pre-tick the lines a seller can actually sell; a protocol swap resets the choice.
	useEffect(() => {
		if (!active) return;
		setChecked(
			Object.fromEntries(active.items.map((item) => [item.id, item.inStock])),
		);
	}, [active]);

	if (!protocols.length) {
		return (
			<p className="text-sm text-[#616161]">
				Bệnh này chưa cấu hình bộ thuốc. Chọn thuốc thủ công bên dưới.
			</p>
		);
	}

	const selectedItems = active
		? active.items.filter(
				(item) =>
					checked[item.id] &&
					item.inStock &&
					item.needAmount !== null &&
					item.packs !== null,
			  )
		: [];

	return (
		<div className="flex flex-col gap-3">
			<div className="rounded-xl border border-[#b7ddb3] bg-white p-3">
				<p className="mb-2 text-base font-semibold text-[#2e7d32]">
					Diện tích canh tác
				</p>
				<div className="flex gap-2">
					<input
						inputMode="decimal"
						value={area.value}
						onChange={(event) =>
							onAreaChange({ ...area, value: event.target.value })
						}
						placeholder="Ví dụ: 3"
						aria-label="Diện tích"
						className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-white px-3 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
					/>
					<select
						value={area.unit}
						onChange={(event) =>
							onAreaChange({ ...area, unit: event.target.value as AreaUnitId })
						}
						aria-label="Đơn vị diện tích"
						className="h-11 shrink-0 rounded-lg border border-border bg-white px-2 text-sm"
					>
						{AREA_UNIT_OPTIONS.map((option) => (
							<option key={option.id} value={option.id}>
								{option.label}
							</option>
						))}
					</select>
				</div>
			</div>

			<div className="flex gap-2 overflow-x-auto pb-1">
				{protocols.map((protocol) => {
					const badge = STATUS_BADGE[protocol.status];
					const isActive = active?.id === protocol.id;
					return (
						<button
							key={protocol.id}
							type="button"
							onClick={() => setActiveId(protocol.id)}
							aria-pressed={isActive}
							className={`flex shrink-0 flex-col items-start gap-1 rounded-xl border px-3 py-2 text-left ${
								isActive
									? "border-primary bg-white ring-2 ring-primary/20"
									: "border-border bg-white"
							}`}
						>
							<span className="text-sm font-semibold">{protocol.name}</span>
							<span className="flex items-center gap-1">
								{protocol.isDefault ? (
									<span className="rounded-full bg-[#e3f2fd] px-2 py-0.5 text-xs text-[#1565c0]">
										Mặc định
									</span>
								) : (
									<span className="rounded-full bg-[#f5f5f5] px-2 py-0.5 text-xs text-[#616161]">
										Thay thế
									</span>
								)}
								<span
									className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
								>
									{badge.label}
								</span>
							</span>
						</button>
					);
				})}
			</div>

			{active ? (
				<div className="flex flex-col gap-2">
					{active.note ? (
						<p className="text-sm text-[#616161]">{active.note}</p>
					) : null}
					{active.items.map((item) => (
						<label
							key={item.id}
							className="flex items-start gap-2 rounded-lg border border-border bg-white p-3"
						>
							<input
								type="checkbox"
								checked={!!checked[item.id]}
								disabled={
									!item.inStock ||
									item.needAmount === null ||
									item.packs === null
								}
								onChange={(event) =>
									setChecked((prev) => ({
										...prev,
										[item.id]: event.target.checked,
									}))
								}
								aria-label={`Chọn ${item.productName ?? item.activeIngredient ?? "thuốc"}`}
								className="mt-1 size-5 shrink-0 accent-[#2e7d32]"
							/>
							<span className="min-w-0 flex-1">
								<span className="block font-semibold">
									{item.productName ?? item.activeIngredient}
								</span>
								{!item.productId ? (
									<span className="block text-xs text-[#ef6c00]">
										Chỉ có hoạt chất — người bán tự chọn sản phẩm tương đương
									</span>
								) : (
									<span className="block text-xs text-[#616161]">
										{item.inStock
											? `Còn ${formatNumber(item.availableQty)} ${item.unit ?? ""}`
											: "Hết hàng / không bán được"}
									</span>
								)}
								<span className="mt-1 block text-sm font-semibold text-[#2e7d32]">
									{quantityLabel(item)}
								</span>
								{item.mixing ? (
									<span className="mt-1 block text-xs text-[#616161]">
										<strong>Cách pha:</strong> {item.mixing}
									</span>
								) : null}
								{item.usage ? (
									<span className="block text-xs text-[#616161]">
										<strong>Cách dùng:</strong> {item.usage}
									</span>
								) : null}
							</span>
						</label>
					))}

					<p className="text-xs text-[#616161]">
						Gợi ý tham khảo — kiểm tra nhãn thuốc và xác nhận trước khi thêm vào
						giỏ.
					</p>

					<button
						type="button"
						disabled={!selectedItems.length}
						onClick={() => onConfirm(active, selectedItems)}
						className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#bdbdbd]"
					>
						{selectedItems.length ? (
							<Check className="size-4" aria-hidden />
						) : (
							<Plus className="size-4" aria-hidden />
						)}
						<span>
							{selectedItems.length
								? `Xác nhận thêm ${selectedItems.length} thuốc`
								: "Chọn thuốc để thêm"}
						</span>
					</button>
				</div>
			) : null}
		</div>
	);
}
