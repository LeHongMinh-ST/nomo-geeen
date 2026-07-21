"use client";

import { Phone, Truck } from "lucide-react";
import Link from "next/link";
import {
	supplierTypeLabel,
	type TenantSupplier,
} from "@/lib/tenant-suppliers-api";
import { formatVND } from "@/lib/format";

export function SupplierCard({ supplier }: { supplier: TenantSupplier }) {
	return (
		<Link
			href={`/nha-cung-cap/${supplier.id}`}
			className="flex items-start gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card transition-shadow hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
		>
			<span className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-[#1a6fa8]">
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
					{supplierTypeLabel(supplier.supplierType)}
					{supplier.address ? ` · ${supplier.address}` : ""}
				</p>
				<div className="mt-1 flex items-end justify-between gap-2">
					<span className="flex items-center gap-1.5 text-sm text-[#9e9e9e]">
						<Phone className="size-4" aria-hidden />
						{supplier.phone ?? "Chưa có số điện thoại"}
					</span>
					{supplier.balance > 0 ? (
						<span className="text-right text-sm text-[#616161]">
							Phải trả{" "}
							<span className="ml-1 text-lg font-bold text-[#f57f17]">
								{formatVND(supplier.balance)}₫
							</span>
						</span>
					) : null}
				</div>
			</div>
		</Link>
	);
}
