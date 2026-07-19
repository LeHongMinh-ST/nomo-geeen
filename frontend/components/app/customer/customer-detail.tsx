"use client";

import {
	ArrowLeft,
	MapPin,
	Package,
	Pencil,
	Phone,
	Receipt,
	Trash2,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type Customer, customerTypeLabel } from "@/lib/customers";
import {
	debtOutstanding,
	debtStatus,
	debtStatusBadgeClass,
	debtStatusLabel,
	getDebt,
} from "@/lib/debts";
import { formatDate, formatVND } from "@/lib/format";
import {
	orderStatusBadgeClass,
	orderStatusLabel,
	orders,
	orderTotal,
	paymentMethodLabel,
} from "@/lib/orders";

/**
 * Chi tiết khách hàng (DESIGN.md §24 — trang riêng, không modal).
 * Gắn công nợ hiện tại (receivables) + lịch sử đơn hàng (orders theo customerId).
 * FE-only: xóa cục bộ, chưa nối API.
 */
export function CustomerDetail({ customer }: { customer: Customer }) {
	const router = useRouter();
	const [confirmDelete, setConfirmDelete] = useState(false);

	// Công nợ: tài khoản receivable dùng chung id với khách (kh1, kh3, kh5...).
	const debtAccount = getDebt(customer.id);
	const outstanding = debtAccount
		? debtOutstanding(debtAccount)
		: customer.debt;
	const hasDebt = outstanding > 0;

	// Lịch sử đơn hàng của khách này.
	const customerOrders = orders
		.filter((o) => o.customerId === customer.id)
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-28 lg:mx-0 lg:pb-0">
			{/* Header */}
			<div className="flex items-start gap-3">
				<button
					type="button"
					onClick={() => router.push("/khach-hang")}
					aria-label="Quay lại danh sách"
					className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
				>
					<ArrowLeft className="size-5" aria-hidden />
				</button>
				<div className="flex flex-1 items-center gap-3">
					<span
						className="flex size-14 shrink-0 items-center justify-center rounded-full text-xl font-semibold text-white"
						style={{ backgroundColor: "#1a6fa8" }}
					>
						{initials(customer.name)}
					</span>
					<div className="flex min-w-0 flex-col gap-0.5">
						<h1 className="truncate text-2xl font-bold tracking-tight text-foreground">
							{customer.name}
						</h1>
						<p className="text-base text-[#616161]">
							{customerTypeLabel[customer.type]}
						</p>
					</div>
				</div>
			</div>

			{/* Thông tin liên hệ */}
			<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
					Thông tin liên hệ
				</h2>
				<a
					href={`tel:${customer.phone}`}
					className="flex items-center gap-3 text-base text-foreground"
				>
					<Phone className="size-5 text-[#1a6fa8]" aria-hidden />
					<span className="font-semibold">{customer.phone}</span>
				</a>
				{customer.address ? (
					<div className="flex items-start gap-3 text-base text-foreground">
						<MapPin className="mt-0.5 size-5 text-[#9e9e9e]" aria-hidden />
						<span>{customer.address}</span>
					</div>
				) : null}
			</section>

			{/* Công nợ hiện tại */}
			<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<div className="flex items-center justify-between">
					<h2 className="text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
						Công nợ hiện tại
					</h2>
					{debtAccount ? (
						<span
							className={`rounded-full px-3 py-1 text-sm font-semibold ${debtStatusBadgeClass[debtStatus(debtAccount)]}`}
						>
							{debtStatusLabel[debtStatus(debtAccount)]}
						</span>
					) : null}
				</div>
				<div className="flex items-end justify-between gap-3">
					<span className="flex items-center gap-2 text-base text-[#616161]">
						<Wallet className="size-5 text-[#1a6fa8]" aria-hidden />
						Khách đang nợ
					</span>
					<span
						className={`text-[26px] font-bold leading-none ${hasDebt ? "text-[#f57f17]" : "text-[#2e7d32]"}`}
					>
						{formatVND(outstanding)}
						<span className="ml-1 text-lg">₫</span>
					</span>
				</div>
				{hasDebt ? (
					<Link
						href={`/cong-no/${customer.id}`}
						className="flex h-12 items-center justify-center gap-2 rounded-[10px] bg-primary text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530]"
					>
						<Wallet className="size-5" aria-hidden />
						Thu tiền
					</Link>
				) : (
					<p className="text-base text-[#616161]">Khách không còn nợ.</p>
				)}
			</section>

			{/* Lịch sử đơn hàng */}
			<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
					Lịch sử đơn hàng ({customerOrders.length})
				</h2>
				{customerOrders.length === 0 ? (
					<div className="flex flex-col items-center gap-2 py-6 text-center">
						<Package className="size-8 text-[#9e9e9e]" aria-hidden />
						<p className="text-base text-[#616161]">Chưa có đơn hàng nào.</p>
					</div>
				) : (
					<ul className="flex flex-col divide-y divide-border">
						{customerOrders.map((o) => (
							<li key={o.id}>
								<Link
									href={`/don-ban-hang/${o.id}`}
									className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"
								>
									<span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#e8f5e9]">
										<Receipt className="size-5 text-[#1a6fa8]" aria-hidden />
									</span>
									<div className="flex min-w-0 flex-1 flex-col gap-0.5">
										<div className="flex items-center gap-2">
											<span className="text-base font-semibold text-foreground">
												{o.code}
											</span>
											<span
												className={`rounded-full px-2 py-0.5 text-xs font-semibold ${orderStatusBadgeClass[o.status]}`}
											>
												{orderStatusLabel[o.status]}
											</span>
										</div>
										<span className="text-sm text-[#9e9e9e]">
											{formatDate(o.createdAt)} ·{" "}
											{paymentMethodLabel[o.payment]}
										</span>
									</div>
									<span className="whitespace-nowrap text-base font-bold text-foreground">
										{formatVND(orderTotal(o))}₫
									</span>
								</Link>
							</li>
						))}
					</ul>
				)}
			</section>

			{/* Hành động — dính đáy mobile, inline desktop */}
			<div className="fixed inset-x-0 bottom-nav-safe z-30 border-t border-border bg-card px-4 py-3 lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
				{confirmDelete ? (
					<div className="flex items-center gap-3">
						<span className="flex-1 text-base font-medium text-foreground">
							Xóa khách hàng này?
						</span>
						<button
							type="button"
							onClick={() => setConfirmDelete(false)}
							className="h-12 rounded-[10px] border border-border px-5 text-base font-semibold text-[#616161] hover:bg-[#f5f5f5]"
						>
							Không
						</button>
						<button
							type="button"
							onClick={() => router.push("/khach-hang")}
							className="h-12 rounded-[10px] bg-destructive px-5 text-base font-semibold text-white hover:bg-[#c62828]"
						>
							Xóa
						</button>
					</div>
				) : (
					<div className="flex items-center gap-3">
						<button
							type="button"
							onClick={() => setConfirmDelete(true)}
							className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[10px] border border-border bg-white text-base font-semibold text-destructive transition-colors duration-200 ease-out hover:bg-[#fdecea] lg:h-12 lg:flex-none lg:px-6"
						>
							<Trash2 className="size-5" aria-hidden />
							Xóa
						</button>
						<Link
							href={`/khach-hang/${customer.id}/sua`}
							className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[10px] bg-primary text-lg font-bold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530] lg:h-12 lg:flex-none lg:px-8"
						>
							<Pencil className="size-5" aria-hidden />
							Sửa thông tin
						</Link>
					</div>
				)}
			</div>
		</div>
	);
}

/** Lấy 1–2 chữ cái đầu của tên làm avatar. */
function initials(name: string): string {
	const parts = name.trim().split(/\s+/);
	const last = parts[parts.length - 1]?.[0] ?? "";
	const first = parts.length > 1 ? parts[0][0] : "";
	return (first + last).toUpperCase() || "?";
}
