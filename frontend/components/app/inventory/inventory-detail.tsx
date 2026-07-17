"use client";

import {
	ArrowLeft,
	CalendarClock,
	ClipboardCheck,
	History,
	Layers,
	Warehouse,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdjustSheet } from "@/components/app/inventory/adjust-sheet";
import { formatDate, formatVND } from "@/lib/format";
import {
	type Adjustment,
	type Batch,
	expiryStatusBadgeClass,
	expiryStatusLabel,
	expiryStatusOf,
	getInventory,
	getStockStatus,
	type Product,
	stockStatusBadgeClass,
	stockStatusLabel,
} from "@/lib/inventory";

/**
 * Chi tiết tồn kho một sản phẩm (DESIGN.md §24 — trang riêng).
 * Hiển thị tồn tổng, các lô + HSD, lịch sử điều chỉnh; nút mở sheet kiểm kê.
 * FE-only: điều chỉnh cập nhật cục bộ, chưa nối API.
 */
export function InventoryDetail({ product: initial }: { product: Product }) {
	const router = useRouter();
	const [product, setProduct] = useState<Product>(initial);
	const [adjusting, setAdjusting] = useState(false);
	const [localAdjustments, setLocalAdjustments] = useState<Adjustment[]>([]);

	const item = getInventory(product.id);
	const stockStatus = getStockStatus(product);
	const batches = item?.batches ?? [];
	const adjustments = [...localAdjustments, ...(item?.adjustments ?? [])];

	function applyAdjust(actual: number, reason: string) {
		const delta = actual - product.stock;
		// TODO: gọi API ghi Adjustment + Audit Log khi backend sẵn sàng.
		setLocalAdjustments((cur) => [
			{
				id: `local-${cur.length}`,
				date: "2026-07-17",
				delta,
				reason,
			},
			...cur,
		]);
		setProduct((p) => ({ ...p, stock: actual }));
		setAdjusting(false);
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-28 lg:mx-0 lg:pb-0">
			{/* Header */}
			<div className="flex items-start gap-3">
				<button
					type="button"
					onClick={() => router.push("/ton-kho")}
					aria-label="Quay lại danh sách"
					className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
				>
					<ArrowLeft className="size-5" aria-hidden />
				</button>
				<div className="flex flex-1 flex-col gap-1 pt-0.5">
					<div className="flex items-center gap-2.5">
						<h1 className="text-xl font-bold tracking-tight text-foreground">
							{product.name}
						</h1>
						<span
							className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold ${stockStatusBadgeClass[stockStatus]}`}
						>
							{stockStatusLabel[stockStatus]}
						</span>
					</div>
					<p className="text-base text-[#616161]">{product.sku}</p>
				</div>
			</div>

			{/* Tồn tổng + giá trị */}
			<section className="grid grid-cols-2 gap-3">
				<div className="flex flex-col gap-1 rounded-[16px] border border-border bg-card p-5 shadow-card">
					<span className="text-sm text-[#616161]">Tồn kho</span>
					<span className="text-[26px] font-bold leading-tight text-foreground">
						{formatVND(product.stock)}
						<span className="ml-1 text-base font-medium text-[#9e9e9e]">
							{product.baseUnit}
						</span>
					</span>
				</div>
				<div className="flex flex-col gap-1 rounded-[16px] border border-border bg-card p-5 shadow-card">
					<span className="text-sm text-[#616161]">Giá trị tồn</span>
					<span className="text-[26px] font-bold leading-tight text-foreground">
						{formatVND(product.stock * product.costPrice)}
						<span className="ml-1 text-base font-medium text-[#9e9e9e]">₫</span>
					</span>
				</div>
			</section>

			{/* Các lô */}
			<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
					<Layers className="size-4" aria-hidden />
					Lô hàng ({batches.length})
				</h2>
				<ul className="flex flex-col divide-y divide-border">
					{batches.map((b) => (
						<BatchRow key={b.id} batch={b} baseUnit={product.baseUnit} />
					))}
				</ul>
			</section>

			{/* Lịch sử điều chỉnh */}
			{adjustments.length > 0 ? (
				<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
					<h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
						<History className="size-4" aria-hidden />
						Lịch sử điều chỉnh
					</h2>
					<ul className="flex flex-col divide-y divide-border">
						{adjustments.map((a) => (
							<li
								key={a.id}
								className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
							>
								<div className="flex min-w-0 flex-col">
									<span className="text-base font-medium text-foreground">
										{a.reason}
									</span>
									<span className="text-sm text-[#9e9e9e]">
										{formatDate(a.date)}
									</span>
								</div>
								<span
									className={`whitespace-nowrap text-base font-bold ${
										a.delta > 0 ? "text-[#2e7d32]" : "text-[#f57f17]"
									}`}
								>
									{a.delta > 0 ? "+" : "−"}
									{formatVND(Math.abs(a.delta))} {product.baseUnit}
								</span>
							</li>
						))}
					</ul>
				</section>
			) : null}

			{/* Nút kiểm kê — dính đáy mobile, inline desktop */}
			<div className="fixed inset-x-0 bottom-nav-safe z-30 border-t border-border bg-card px-4 py-3 lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
				<button
					type="button"
					onClick={() => setAdjusting(true)}
					className="flex h-14 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-lg font-bold text-white transition-colors duration-200 ease-out hover:bg-[#43a047] active:bg-[#2e7d32] lg:h-12 lg:w-auto lg:px-8"
				>
					<ClipboardCheck className="size-6" aria-hidden />
					Kiểm kê / Điều chỉnh
				</button>
			</div>

			<AdjustSheet
				product={adjusting ? product : null}
				onClose={() => setAdjusting(false)}
				onConfirm={applyAdjust}
			/>
		</div>
	);
}

function BatchRow({ batch, baseUnit }: { batch: Batch; baseUnit: string }) {
	const es = expiryStatusOf(batch.expiry);
	return (
		<li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
			<div className="flex min-w-0 flex-col gap-1">
				<span className="text-base font-semibold text-foreground">
					{batch.code === "—" ? "Không theo lô" : `Lô ${batch.code}`}
				</span>
				{batch.expiry ? (
					<span
						className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${expiryStatusBadgeClass[es]}`}
					>
						<CalendarClock className="size-3.5" aria-hidden />
						{es === "expired"
							? expiryStatusLabel.expired
							: `HSD ${formatDate(batch.expiry)}`}
					</span>
				) : (
					<span className="text-sm text-[#9e9e9e]">Không HSD</span>
				)}
			</div>
			<span className="flex items-center gap-1.5 whitespace-nowrap text-base font-bold text-foreground">
				<Warehouse className="size-4 text-[#9e9e9e]" aria-hidden />
				{formatVND(batch.qty)} {baseUnit}
			</span>
		</li>
	);
}
