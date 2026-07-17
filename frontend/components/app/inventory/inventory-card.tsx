"use client";

import { CalendarClock, Warehouse } from "lucide-react";
import Link from "next/link";
import { formatDate, formatVND } from "@/lib/format";
import {
	type ExpiryStatus,
	earliestExpiry,
	expiryStatusBadgeClass,
	expiryStatusLabel,
	getInventory,
	getStockStatus,
	type Product,
	stockStatusBadgeClass,
	stockStatusLabel,
} from "@/lib/inventory";

/**
 * Thẻ 1 mặt hàng tồn cho mobile (DESIGN.md §12.1).
 * Tile màu module "Tồn kho" (Indigo #3949ab). Badge tồn + HSD.
 */
export function InventoryCard({
	product,
	expiryStatus,
}: {
	product: Product;
	expiryStatus: ExpiryStatus;
}) {
	const stockStatus = getStockStatus(product);
	const item = getInventory(product.id);
	const expiry = item ? earliestExpiry(item) : undefined;

	return (
		<Link
			href={`/ton-kho/${product.id}`}
			className="flex items-start gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card transition-shadow duration-200 ease-out hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
		>
			<span
				className="flex size-12 shrink-0 items-center justify-center rounded-[12px]"
				style={{ backgroundColor: "#3949ab" }}
			>
				<Warehouse className="size-6 text-white" aria-hidden />
			</span>

			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex items-start justify-between gap-2">
					<p className="line-clamp-2 text-base font-semibold text-foreground">
						{product.name}
					</p>
					<span
						className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${stockStatusBadgeClass[stockStatus]}`}
					>
						{stockStatusLabel[stockStatus]}
					</span>
				</div>

				<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#616161]">
					<span>
						Tồn:{" "}
						<span className="font-semibold text-foreground">
							{formatVND(product.stock)} {product.baseUnit}
						</span>
					</span>
					{expiryStatus !== "none" && expiry ? (
						<span
							className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${expiryStatusBadgeClass[expiryStatus]}`}
						>
							<CalendarClock className="size-3.5" aria-hidden />
							{expiryStatus === "expired"
								? expiryStatusLabel.expired
								: `HSD ${formatDate(expiry)}`}
						</span>
					) : null}
				</div>

				<div className="mt-1 flex items-end justify-between gap-2">
					<span className="text-sm text-[#9e9e9e]">Giá trị tồn</span>
					<span className="text-lg font-bold text-foreground">
						{formatVND(product.stock * product.costPrice)}
						<span className="ml-0.5 text-sm">₫</span>
					</span>
				</div>
			</div>
		</Link>
	);
}
