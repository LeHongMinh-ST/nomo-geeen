"use client";

import { Phone, Truck } from "lucide-react";
import Link from "next/link";
import { type Supplier, supplierTypeLabel } from "@/lib/suppliers";

/**
 * Thẻ 1 nhà cung cấp cho mobile (DESIGN.md §12.1).
 * Tile màu module "Nhà cung cấp" (Brand Blue #1a6fa8).
 * payable: số cửa hàng đang nợ NCC (₫) — truyền từ list, 0 nếu không có.
 */
export function SupplierCard({
	supplier,
	payable,
}: {
	supplier: Supplier;
	payable: number;
}) {
	return (
		<Link
			href={`/nha-cung-cap/${supplier.id}`}
			className="flex items-start gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card transition-shadow duration-200 ease-out hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
		>
			<span
				className="flex size-12 shrink-0 items-center justify-center rounded-[12px]"
				style={{ backgroundColor: "#1a6fa8" }}
			>
				<Truck className="size-6 text-white" aria-hidden />
			</span>

			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex items-start justify-between gap-2">
					<p className="truncate text-base font-semibold text-foreground">
						{supplier.name}
					</p>
					<span className="shrink-0 rounded-full bg-[#f5f5f5] px-2.5 py-0.5 text-xs font-semibold text-[#616161]">
						{supplier.code}
					</span>
				</div>

				<p className="truncate text-sm text-[#616161]">
					{supplierTypeLabel[supplier.type]}
					{supplier.address ? ` · ${supplier.address}` : ""}
				</p>

				<div className="mt-1 flex items-end justify-between gap-2">
					<span className="flex items-center gap-1.5 text-sm text-[#9e9e9e]">
						<Phone className="size-4" aria-hidden />
						{supplier.phone}
					</span>
					{payable > 0 ? (
						<span className="text-right text-sm text-[#616161]">
							Phải trả
							<span className="ml-1.5 text-lg font-bold text-[#f57f17]">
								{new Intl.NumberFormat("vi-VN").format(payable)}
								<span className="ml-0.5 text-sm">₫</span>
							</span>
						</span>
					) : null}
				</div>
			</div>
		</Link>
	);
}
