"use client";

import {
	ArrowLeft,
	Banknote,
	CalendarClock,
	FileText,
	HandCoins,
	Phone,
	QrCode,
	Smartphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
	type DebtAccount,
	type DebtEntry,
	type DebtPaymentMethod,
	debtAmountColor,
	debtCharged,
	debtDueText,
	debtOpening,
	debtOutstanding,
	debtPaid,
	debtStatus,
	debtStatusBadgeClass,
	debtStatusLabel,
	paymentMethodLabel,
	withPayment,
} from "@/lib/debts";
import { formatDate, formatVND } from "@/lib/format";
import { CollectPaymentSheet } from "./collect-payment-sheet";

/**
 * Chi tiết công nợ (DESIGN.md §16, §24 — trang riêng, không modal).
 * Card số dư: Đầu kỳ + Phát sinh − Đã thu/trả = Còn lại (số lớn màu cảnh báo).
 * Timeline lịch sử thu tiền. Nút Thu/Trả dính đáy trên mobile → mở sheet.
 * FE-only: cập nhật cục bộ, chưa nối API.
 */
export function DebtDetail({ account: initial }: { account: DebtAccount }) {
	const router = useRouter();
	const [account, setAccount] = useState<DebtAccount>(initial);
	const [collecting, setCollecting] = useState(false);

	const isReceivable = account.direction === "receivable";
	const status = debtStatus(account);
	const opening = debtOpening(account);
	const charged = debtCharged(account);
	const paid = debtPaid(account);
	const outstanding = debtOutstanding(account);
	const settled = outstanding <= 0;
	const collectVerb = isReceivable ? "Thu" : "Trả";
	const tile = isReceivable ? "#1e88e5" : "#7e57c2";

	const initials = account.name
		.split(" ")
		.slice(-2)
		.map((w) => w[0])
		.join("")
		.toUpperCase();

	// Lịch sử: mới nhất lên đầu.
	const history = [...account.entries].reverse();

	function handleConfirm(amount: number, method: DebtPaymentMethod) {
		// TODO: gọi API ghi nhận thu/trả công nợ khi backend sẵn sàng.
		setAccount((a) => withPayment(a, amount, method));
		setCollecting(false);
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-28 lg:mx-0 lg:pb-0">
			{/* Header */}
			<div className="flex items-start gap-3">
				<button
					type="button"
					onClick={() => router.push("/cong-no")}
					aria-label="Quay lại danh sách"
					className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
				>
					<ArrowLeft className="size-5" aria-hidden />
				</button>
				<div className="flex flex-1 items-start gap-3">
					<span
						className="flex size-12 shrink-0 items-center justify-center rounded-[12px] text-base font-bold text-white"
						style={{ backgroundColor: tile }}
					>
						{initials}
					</span>
					<div className="flex min-w-0 flex-1 flex-col gap-1">
						<div className="flex flex-wrap items-center gap-2">
							<h1 className="text-2xl font-bold tracking-tight text-foreground">
								{account.name}
							</h1>
							<span
								className={`rounded-full px-3 py-1 text-sm font-semibold ${debtStatusBadgeClass[status]}`}
							>
								{debtStatusLabel[status]}
							</span>
						</div>
						<p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-base text-[#616161]">
							<span className="flex items-center gap-1.5">
								<Phone className="size-4" aria-hidden />
								{account.phone}
							</span>
							<span className="text-[#9e9e9e]">{account.partyLabel}</span>
						</p>
					</div>
				</div>
			</div>

			{/* Card số dư */}
			<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<div className="flex flex-col items-center gap-1 rounded-[14px] bg-[#fff8e1] py-5">
					<span className="text-sm font-medium text-[#8d6e00]">
						{settled
							? "Đã tất toán"
							: isReceivable
								? "Khách còn nợ"
								: "Còn phải trả"}
					</span>
					<span
						className={`text-[34px] font-bold leading-none ${debtAmountColor(account)}`}
					>
						{formatVND(outstanding)}
						<span className="ml-1 text-xl">₫</span>
					</span>
					{!settled && account.dueDate ? (
						<span className="mt-1 flex items-center gap-1.5 text-sm font-medium text-[#8d6e00]">
							<CalendarClock className="size-4" aria-hidden />
							{debtDueText(account)} · hạn {formatDate(account.dueDate)}
						</span>
					) : null}
				</div>

				<dl className="flex flex-col gap-2.5">
					<Row label="Nợ đầu kỳ" value={opening} />
					<Row
						label={isReceivable ? "Phát sinh bán chịu" : "Phát sinh nhập nợ"}
						value={charged}
						sign="+"
					/>
					<Row
						label={isReceivable ? "Đã thu" : "Đã trả"}
						value={paid}
						sign="−"
						tone="paid"
					/>
					<div className="mt-1 flex items-center justify-between border-t border-border pt-3">
						<span className="text-base font-semibold text-foreground">
							Còn lại
						</span>
						<span className={`text-xl font-bold ${debtAmountColor(account)}`}>
							{formatVND(outstanding)}₫
						</span>
					</div>
				</dl>
			</section>

			{/* Lịch sử biến động */}
			<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
					Lịch sử công nợ ({account.entries.length})
				</h2>
				<ul className="flex flex-col">
					{history.map((e) => (
						<HistoryItem key={e.id} entry={e} isReceivable={isReceivable} />
					))}
				</ul>
			</section>

			{/* Hành động — dính đáy trên mobile, inline trên desktop */}
			{settled ? (
				<div className="flex items-center justify-center gap-2 rounded-[16px] border border-[#c8e6c9] bg-[#e8f5e9] px-4 py-4 text-base font-semibold text-[#2e7d32]">
					<HandCoins className="size-5" aria-hidden />
					Công nợ đã tất toán
				</div>
			) : (
				<div className="fixed inset-x-0 bottom-nav-safe z-30 border-t border-border bg-card px-4 py-3 lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
					<button
						type="button"
						onClick={() => setCollecting(true)}
						className="flex h-14 w-full items-center justify-center gap-2 rounded-[10px] bg-primary text-lg font-bold text-white transition-colors duration-200 ease-out hover:bg-[#43a047] active:bg-[#2e7d32] lg:h-12 lg:w-auto lg:px-8"
					>
						<HandCoins className="size-6" aria-hidden />
						{collectVerb} tiền
					</button>
				</div>
			)}

			<CollectPaymentSheet
				account={collecting ? account : null}
				onClose={() => setCollecting(false)}
				onConfirm={handleConfirm}
			/>
		</div>
	);
}

function Row({
	label,
	value,
	sign,
	tone,
}: {
	label: string;
	value: number;
	sign?: "+" | "−";
	tone?: "paid";
}) {
	return (
		<div className="flex items-center justify-between text-base text-[#616161]">
			<span>{label}</span>
			<span
				className={`font-medium ${tone === "paid" ? "text-[#2e7d32]" : "text-foreground"}`}
			>
				{sign ?? ""}
				{formatVND(value)}₫
			</span>
		</div>
	);
}

const methodIcon = {
	cash: Banknote,
	transfer: Smartphone,
	qr: QrCode,
} as const;

function HistoryItem({
	entry,
	isReceivable,
}: {
	entry: DebtEntry;
	isReceivable: boolean;
}) {
	if (entry.kind === "payment") {
		const Icon = entry.method ? methodIcon[entry.method] : HandCoins;
		return (
			<li className="flex items-start gap-3 border-b border-border py-3 last:border-b-0">
				<span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#e8f5e9]">
					<Icon className="size-5 text-[#2e7d32]" aria-hidden />
				</span>
				<div className="flex min-w-0 flex-1 flex-col">
					<span className="text-base font-semibold text-foreground">
						{isReceivable ? "Thu tiền" : "Trả tiền"}
						{entry.method ? ` · ${paymentMethodLabel[entry.method]}` : ""}
					</span>
					<span className="text-sm text-[#9e9e9e]">
						{formatDate(entry.date)}
						{entry.note ? ` · ${entry.note}` : ""}
					</span>
				</div>
				<span className="whitespace-nowrap text-base font-bold text-[#2e7d32]">
					−{formatVND(entry.amount)}₫
				</span>
			</li>
		);
	}

	const isOpening = entry.kind === "opening";
	return (
		<li className="flex items-start gap-3 border-b border-border py-3 last:border-b-0">
			<span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#fff8e1]">
				{isOpening ? (
					<CalendarClock className="size-5 text-[#f57f17]" aria-hidden />
				) : (
					<FileText className="size-5 text-[#f57f17]" aria-hidden />
				)}
			</span>
			<div className="flex min-w-0 flex-1 flex-col">
				<span className="text-base font-semibold text-foreground">
					{isOpening ? "Nợ đầu kỳ" : isReceivable ? "Bán chịu" : "Nhập ghi nợ"}
					{entry.ref ? ` · ${entry.ref}` : ""}
				</span>
				<span className="text-sm text-[#9e9e9e]">
					{formatDate(entry.date)}
					{entry.note ? ` · ${entry.note}` : ""}
				</span>
			</div>
			<span className="whitespace-nowrap text-base font-bold text-[#f57f17]">
				+{formatVND(entry.amount)}₫
			</span>
		</li>
	);
}
