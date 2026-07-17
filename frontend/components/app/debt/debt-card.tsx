"use client";

import { HandCoins, Phone } from "lucide-react";
import Link from "next/link";
import {
	type DebtAccount,
	debtAmountColor,
	debtDueText,
	debtOutstanding,
	debtStatus,
	debtStatusBadgeClass,
	debtStatusLabel,
} from "@/lib/debts";
import { formatVND } from "@/lib/format";

/**
 * Thẻ 1 công nợ cho mobile (DESIGN.md §12.1, §16).
 * Dòng đầu: tên + trạng thái (badge). Giữa: SĐT + hạn. Cuối: số nợ lớn đậm màu cảnh báo.
 * Hành động "Thu/Trả tiền" đặt ngay trên thẻ; bấm phần còn lại mở chi tiết.
 */
export function DebtCard({
	account,
	onCollect,
}: {
	account: DebtAccount;
	onCollect: (account: DebtAccount) => void;
}) {
	const status = debtStatus(account);
	const outstanding = debtOutstanding(account);
	const isReceivable = account.direction === "receivable";
	// Tile màu module accent: khách (Blue) / NCC (Purple) — §3.
	const tile = isReceivable ? "#1e88e5" : "#7e57c2";
	const initials = account.name
		.split(" ")
		.slice(-2)
		.map((w) => w[0])
		.join("")
		.toUpperCase();

	return (
		<div className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card">
			<Link href={`/cong-no/${account.id}`} className="flex items-start gap-3">
				<span
					className="flex size-12 shrink-0 items-center justify-center rounded-[12px] text-base font-bold text-white"
					style={{ backgroundColor: tile }}
				>
					{initials}
				</span>

				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<div className="flex items-start justify-between gap-2">
						<p className="truncate text-base font-semibold text-foreground">
							{account.name}
						</p>
						<span
							className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${debtStatusBadgeClass[status]}`}
						>
							{debtStatusLabel[status]}
						</span>
					</div>

					<p className="flex items-center gap-1.5 text-sm text-[#616161]">
						<Phone className="size-3.5 shrink-0" aria-hidden />
						{account.phone}
					</p>

					<div className="mt-1 flex items-end justify-between gap-2">
						<span className="text-sm text-[#9e9e9e]">
							{debtDueText(account)}
						</span>
						<span
							className={`text-xl font-bold leading-none ${debtAmountColor(account)}`}
						>
							{formatVND(outstanding)}
							<span className="ml-0.5 text-sm">₫</span>
						</span>
					</div>
				</div>
			</Link>

			<button
				type="button"
				onClick={() => onCollect(account)}
				className="flex h-12 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-base font-bold text-white transition-colors duration-200 ease-out hover:bg-[#43a047] active:bg-[#2e7d32]"
			>
				<HandCoins className="size-5" aria-hidden />
				{isReceivable ? "Thu tiền" : "Trả tiền"}
			</button>
		</div>
	);
}
