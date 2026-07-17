"use client";

import {
	ArrowLeft,
	CheckCircle2,
	Package,
	Phone,
	UserRound,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getCustomer } from "@/lib/customers";
import { formatDate, formatVND } from "@/lib/format";
import {
	customerLabel,
	lineTotal,
	type Order,
	type OrderStatus,
	orderStatusBadgeClass,
	orderStatusLabel,
	orderSubtotal,
	orderTotal,
	paymentMethodLabel,
} from "@/lib/orders";

/**
 * Chi tiết đơn bán hàng (DESIGN.md §24 — trang riêng, không modal).
 * Đơn Nháp: hành động Hoàn thành / Hủy. Đơn Hoàn thành: chỉ Hủy (inline confirm §21).
 * FE-only: đổi trạng thái cục bộ, chưa nối API.
 */
export function OrderDetail({ order: initial }: { order: Order }) {
	const router = useRouter();
	const [order, setOrder] = useState<Order>(initial);
	const [confirmCancel, setConfirmCancel] = useState(false);

	const customer = order.customerId ? getCustomer(order.customerId) : undefined;
	const subtotal = orderSubtotal(order);
	const total = orderTotal(order);

	function setStatus(status: OrderStatus) {
		// TODO: gọi API cập nhật trạng thái (Completed cộng doanh thu / Cancelled hoàn tồn).
		setOrder((o) => ({ ...o, status }));
		setConfirmCancel(false);
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-28 lg:mx-0 lg:pb-0">
			{/* Header */}
			<div className="flex items-start gap-3">
				<button
					type="button"
					onClick={() => router.push("/don-ban-hang")}
					aria-label="Quay lại danh sách"
					className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
				>
					<ArrowLeft className="size-5" aria-hidden />
				</button>
				<div className="flex flex-1 flex-col gap-1 pt-0.5">
					<div className="flex items-center gap-2.5">
						<h1 className="text-2xl font-bold tracking-tight text-foreground">
							{order.code}
						</h1>
						<span
							className={`rounded-full px-3 py-1 text-sm font-semibold ${orderStatusBadgeClass[order.status]}`}
						>
							{orderStatusLabel[order.status]}
						</span>
					</div>
					<p className="text-base text-[#616161]">
						Ngày tạo {formatDate(order.createdAt)} ·{" "}
						{paymentMethodLabel[order.payment]}
					</p>
				</div>
			</div>

			{/* Khách hàng */}
			<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
					Khách hàng
				</h2>
				{customer ? (
					<div className="flex items-center gap-3">
						<span className="flex size-12 items-center justify-center rounded-full bg-accent text-lg font-semibold text-accent-foreground">
							<UserRound className="size-6" aria-hidden />
						</span>
						<div className="flex min-w-0 flex-col">
							<span className="text-lg font-semibold text-foreground">
								{customer.name}
							</span>
							<span className="flex items-center gap-1.5 text-sm text-[#616161]">
								<Phone className="size-4" aria-hidden />
								{customer.phone}
							</span>
						</div>
					</div>
				) : (
					<div className="flex items-center gap-3">
						<span className="flex size-12 items-center justify-center rounded-full bg-[#f5f5f5] text-[#9e9e9e]">
							<UserRound className="size-6" aria-hidden />
						</span>
						<span className="text-lg font-semibold text-foreground">
							{customerLabel(order)}
						</span>
					</div>
				)}
			</section>

			{/* Danh sách hàng */}
			<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
					Hàng hóa ({order.lines.length})
				</h2>
				<ul className="flex flex-col divide-y divide-border">
					{order.lines.map((l) => (
						<li
							key={l.productId}
							className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
						>
							<span
								className="flex size-10 shrink-0 items-center justify-center rounded-[10px]"
								style={{ backgroundColor: "#9e9d24" }}
							>
								<Package className="size-5 text-white" aria-hidden />
							</span>
							<div className="flex min-w-0 flex-1 flex-col">
								<span className="text-base font-semibold text-foreground">
									{l.name}
								</span>
								<span className="text-sm text-[#9e9e9e]">
									{formatVND(l.price)}₫ × {l.qty} {l.unit}
								</span>
							</div>
							<span className="whitespace-nowrap text-base font-bold text-foreground">
								{formatVND(lineTotal(l))}₫
							</span>
						</li>
					))}
				</ul>
			</section>

			{/* Tổng kết */}
			<section className="flex flex-col gap-2.5 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<div className="flex items-center justify-between text-base text-[#616161]">
					<span>Tạm tính</span>
					<span className="font-medium text-foreground">
						{formatVND(subtotal)}₫
					</span>
				</div>
				{order.discount > 0 ? (
					<div className="flex items-center justify-between text-base text-[#616161]">
						<span>Chiết khấu</span>
						<span className="font-medium text-[#f57f17]">
							−{formatVND(order.discount)}₫
						</span>
					</div>
				) : null}
				<div className="mt-1 flex items-end justify-between border-t border-border pt-3">
					<span className="text-base font-semibold text-foreground">
						Tổng cộng
					</span>
					<span className="text-[26px] font-bold leading-none text-foreground">
						{formatVND(total)}
						<span className="ml-1 text-lg">₫</span>
					</span>
				</div>
			</section>

			{order.note ? (
				<section className="rounded-[16px] border border-border bg-[#fafafa] p-4">
					<p className="text-sm font-semibold text-[#9e9e9e]">Ghi chú</p>
					<p className="mt-1 text-base text-foreground">{order.note}</p>
				</section>
			) : null}

			{/* Hành động — dính đáy trên mobile, inline trên desktop */}
			{order.status !== "cancelled" ? (
				<div className="fixed inset-x-0 bottom-nav-safe z-30 border-t border-border bg-card px-4 py-3 lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
					{confirmCancel ? (
						<div className="flex items-center gap-3">
							<span className="flex-1 text-base font-medium text-foreground">
								Hủy đơn này?
							</span>
							<button
								type="button"
								onClick={() => setConfirmCancel(false)}
								className="h-12 rounded-[10px] border border-border px-5 text-base font-semibold text-[#616161] hover:bg-[#f5f5f5]"
							>
								Không
							</button>
							<button
								type="button"
								onClick={() => setStatus("cancelled")}
								className="h-12 rounded-[10px] bg-destructive px-5 text-base font-semibold text-white hover:bg-[#c62828]"
							>
								Hủy đơn
							</button>
						</div>
					) : (
						<div className="flex items-center gap-3">
							<button
								type="button"
								onClick={() => setConfirmCancel(true)}
								className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[10px] border border-border bg-white text-base font-semibold text-destructive transition-colors duration-200 ease-out hover:bg-[#fdecea] lg:h-12 lg:flex-none lg:px-6"
							>
								<XCircle className="size-5" aria-hidden />
								Hủy đơn
							</button>
							{order.status === "draft" ? (
								<button
									type="button"
									onClick={() => setStatus("completed")}
									className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[10px] bg-primary text-lg font-bold text-white transition-colors duration-200 ease-out hover:bg-[#43a047] active:bg-[#2e7d32] lg:h-12 lg:flex-none lg:px-8"
								>
									<CheckCircle2 className="size-6" aria-hidden />
									Hoàn thành đơn
								</button>
							) : null}
						</div>
					)}
				</div>
			) : (
				<Link
					href="/don-ban-hang"
					className="flex h-12 items-center justify-center rounded-[10px] border border-border bg-card text-base font-semibold text-foreground hover:bg-[#f5f5f5]"
				>
					Về danh sách đơn
				</Link>
			)}
		</div>
	);
}
