"use client";

import { Phone } from "lucide-react";
import Link from "next/link";
import { formatVND } from "@/lib/format";
import { type Customer, customerTypeLabel } from "@/lib/tenant-customers-api";

export function CustomerCard({ customer }: { customer: Customer }) {
	const hasDebt = customer.balance > 0;
	return (
		<Link
			href={`/khach-hang/${customer.id}`}
			className="flex items-start gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card"
		>
			<span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#1a6fa8] text-lg font-semibold text-white">
				{initials(customer.name)}
			</span>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<div className="flex items-start justify-between gap-2">
					<p className="truncate font-semibold">{customer.name}</p>
					<span
						className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${hasDebt ? "bg-[#fff8e1] text-[#f57f17]" : "bg-[#e8f5e9] text-[#2e7d32]"}`}
					>
						{hasDebt ? "Còn nợ" : "Không nợ"}
					</span>
				</div>
				<p className="truncate text-sm text-[#616161]">
					{customer.type ? customerTypeLabel[customer.type] : "Chưa phân loại"}
					{customer.address ? ` · ${customer.address}` : ""}
				</p>
				<div className="flex items-end justify-between gap-2">
					<span className="flex items-center gap-1.5 text-sm text-[#9e9e9e]">
						<Phone className="size-4" />
						{customer.phone || "Chưa có số điện thoại"}
					</span>
					{hasDebt ? (
						<span className="font-bold text-[#f57f17]">
							{formatVND(customer.balance)}₫
						</span>
					) : null}
				</div>
			</div>
		</Link>
	);
}

function initials(name: string) {
	const parts = name.trim().split(/\s+/);
	return (
		(
			(parts.length > 1 ? parts[0][0] : "") + (parts.at(-1)?.[0] ?? "")
		).toUpperCase() || "?"
	);
}
