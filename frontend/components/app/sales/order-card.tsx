"use client";

import { Package } from "lucide-react";
import Link from "next/link";
import { formatDate, formatVND } from "@/lib/format";
import {
	customerLabel,
	type Order,
	orderItemCount,
	orderStatusBadgeClass,
	orderStatusLabel,
	orderTotal,
	paymentMethodLabel,
} from "@/lib/orders";

/**
 * Thẻ 1 đơn bán hàng cho mobile (DESIGN.md §12.1).
 * Dòng đầu: mã đơn + trạng thái. Giữa: khách + số món. Cuối: ngày + tổng lớn đậm.
 */
export function OrderCard({ order }: { order: Order }) {
	return (
		<Link
			href={`/don-ban-hang/${order.id}`}
			className="flex items-start gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card transition-shadow duration-200 ease-out hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
		>
			<span
				className="flex size-12 shrink-0 items-center justify-center rounded-[12px]"
				style={{ backgroundColor: "#43a047" }}
			>
				<Package className="size-6 text-white" aria-hidden />
			</span>

			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex items-start justify-between gap-2">
					<p className="text-base font-semibold text-foreground">
						{order.code}
					</p>
					<span
						className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${orderStatusBadgeClass[order.status]}`}
					>
						{orderStatusLabel[order.status]}
					</span>
				</div>

				<p className="truncate text-sm text-[#616161]">
					{customerLabel(order)} · {orderItemCount(order)} món ·{" "}
					{paymentMethodLabel[order.payment]}
				</p>

				<div className="mt-1 flex items-end justify-between gap-2">
					<span className="text-sm text-[#9e9e9e]">
						{formatDate(order.createdAt)}
					</span>
					<span className="text-lg font-bold text-foreground">
						{formatVND(orderTotal(order))}
						<span className="ml-0.5 text-sm">₫</span>
					</span>
				</div>
			</div>
		</Link>
	);
}
