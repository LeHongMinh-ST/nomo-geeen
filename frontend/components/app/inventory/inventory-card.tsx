"use client";

import { CalendarClock, Warehouse } from "lucide-react";
import Link from "next/link";
import { formatVND } from "@/lib/format";
import { expiryTierBadgeClass, expiryTierLabel } from "@/lib/inventory";
import type { InventoryListItem } from "@/lib/tenant-inventory-api";

/**
 * Thẻ 1 mặt hàng tồn (DESIGN.md §12.1).
 * Tile màu module "Tồn kho" (#5cad45). Badge tồn + badge HSD theo tier server trả về.
 */

type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

export function stockStatusOf(item: InventoryListItem): StockStatus {
	const qty = Number(item.qty);
	return qty <= 0 ? "out-of-stock" : qty <= 10 ? "low-stock" : "in-stock";
}

export const stockStatusLabel: Record<StockStatus, string> = {
	"in-stock": "Còn hàng",
	"low-stock": "Sắp hết",
	"out-of-stock": "Hết hàng",
};

export const stockStatusBadgeClass: Record<StockStatus, string> = {
	"in-stock": "bg-[#e8f5e9] text-[#2e7d32]",
	"low-stock": "bg-[#fff8e1] text-[#f57f17]",
	"out-of-stock": "bg-[#ffebee] text-[#c62828]",
};

export function InventoryCard({ item }: { item: InventoryListItem }) {
	const stockStatus = stockStatusOf(item);
	const tier = item.expiryTier;

	return (
		<Link
			href={`/ton-kho/${item.productId}`}
			className="flex items-start gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card transition-shadow duration-200 ease-out hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
		>
			<span className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-[#5cad45]">
				<Warehouse className="size-6 text-white" aria-hidden />
			</span>

			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex items-start justify-between gap-2">
					<p className="line-clamp-2 text-base font-semibold text-foreground">
						{item.productName}
					</p>
					<span
						className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${stockStatusBadgeClass[stockStatus]}`}
					>
						{stockStatusLabel[stockStatus]}
					</span>
				</div>

				<p className="text-sm text-[#616161]">{item.sku}</p>

				<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#616161]">
					<span>
						Tồn:{" "}
						<span className="font-semibold text-foreground">
							{formatVND(Number(item.qty))} {item.baseUnit}
						</span>
					</span>
					<span
						className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${expiryTierBadgeClass[tier]}`}
					>
						<CalendarClock className="size-3.5" aria-hidden />
						{expiryTierLabel[tier]}
					</span>
				</div>

				{item.nextExpiry ? (
					<p className="text-xs text-[#616161]">
						HSD gần nhất:{" "}
						{new Date(item.nextExpiry).toLocaleDateString("vi-VN")}
					</p>
				) : null}

				<div className="mt-1 flex items-end justify-between gap-2">
					<span className="text-sm text-[#9e9e9e]">Giá trị tồn</span>
					<span className="text-lg font-bold text-foreground">
						{formatVND(Number(item.qty) * Number(item.avgCost))}
						<span className="ml-0.5 text-sm">₫</span>
					</span>
				</div>
			</div>
		</Link>
	);
}
