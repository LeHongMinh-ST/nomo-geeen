"use client";

import { Phone } from "lucide-react";
import Link from "next/link";
import { type Customer, customerTypeLabel } from "@/lib/customers";
import { formatVND } from "@/lib/format";

/**
 * Thẻ 1 khách hàng cho mobile (DESIGN.md §12.1).
 * Tile màu module "Khách hàng" (Brand Blue #1a6fa8).
 * Dòng đầu: tên + badge nợ. Dòng dưới: SĐT + số nợ lớn đậm (nếu còn nợ).
 */
export function CustomerCard({ customer }: { customer: Customer }) {
	const hasDebt = customer.debt > 0;
	return (
		<Link
			href={`/khach-hang/${customer.id}`}
			className="flex items-start gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card transition-shadow duration-200 ease-out hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]"
		>
			<span
				className="flex size-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold text-white"
				style={{ backgroundColor: "#1a6fa8" }}
			>
				{initials(customer.name)}
			</span>

			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex items-start justify-between gap-2">
					<p className="truncate text-base font-semibold text-foreground">
						{customer.name}
					</p>
					<span
						className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
							hasDebt
								? "bg-[#fff8e1] text-[#f57f17]"
								: "bg-[#e8f5e9] text-[#2e7d32]"
						}`}
					>
						{hasDebt ? "Còn nợ" : "Không nợ"}
					</span>
				</div>

				<p className="truncate text-sm text-[#616161]">
					{customerTypeLabel[customer.type]}
					{customer.address ? ` · ${customer.address}` : ""}
				</p>

				<div className="mt-1 flex items-end justify-between gap-2">
					<span className="flex items-center gap-1.5 text-sm text-[#9e9e9e]">
						<Phone className="size-4" aria-hidden />
						{customer.phone}
					</span>
					{hasDebt ? (
						<span className="text-lg font-bold text-[#f57f17]">
							{formatVND(customer.debt)}
							<span className="ml-0.5 text-sm">₫</span>
						</span>
					) : null}
				</div>
			</div>
		</Link>
	);
}

/** Lấy 1–2 chữ cái đầu của tên làm avatar. */
function initials(name: string): string {
	const parts = name.trim().split(/\s+/);
	const last = parts[parts.length - 1]?.[0] ?? "";
	const first = parts.length > 1 ? parts[0][0] : "";
	return (first + last).toUpperCase() || "?";
}
