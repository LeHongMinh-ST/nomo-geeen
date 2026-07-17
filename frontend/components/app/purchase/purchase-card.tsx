"use client";

import { PackagePlus } from "lucide-react";
import Link from "next/link";
import { formatDate, formatVND } from "@/lib/format";
import {
	type Purchase,
	purchaseItemCount,
	purchasePaymentLabel,
	purchaseStatusBadgeClass,
	purchaseStatusLabel,
	purchaseTotal,
	supplierLabel,
} from "@/lib/purchases";

/**
 * Thẻ 1 phiếu nhập cho mobile (DESIGN.md §12.1).
 * Tile màu module "Nhập hàng" (Teal #26a69a).
 */
export function PurchaseCard({ purchase }: { purchase: Purchase }) {
	return (
		<Link
			href={`/nhap-hang/${purchase.id}`}
			className="flex items-start gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card transition-shadow duration-200 ease-out hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
		>
			<span
				className="flex size-12 shrink-0 items-center justify-center rounded-[12px]"
				style={{ backgroundColor: "#26a69a" }}
			>
				<PackagePlus className="size-6 text-white" aria-hidden />
			</span>

			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex items-start justify-between gap-2">
					<p className="text-base font-semibold text-foreground">
						{purchase.code}
					</p>
					<span
						className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${purchaseStatusBadgeClass[purchase.status]}`}
					>
						{purchaseStatusLabel[purchase.status]}
					</span>
				</div>

				<p className="truncate text-sm text-[#616161]">
					{supplierLabel(purchase)} · {purchaseItemCount(purchase)} mặt hàng ·{" "}
					{purchasePaymentLabel[purchase.payment]}
				</p>

				<div className="mt-1 flex items-end justify-between gap-2">
					<span className="text-sm text-[#9e9e9e]">
						{formatDate(purchase.createdAt)}
					</span>
					<span className="text-lg font-bold text-foreground">
						{formatVND(purchaseTotal(purchase))}
						<span className="ml-0.5 text-sm">₫</span>
					</span>
				</div>
			</div>
		</Link>
	);
}
