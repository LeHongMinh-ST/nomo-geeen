"use client";

import {
	ArrowLeft,
	CalendarClock,
	CheckCircle2,
	Layers,
	PackagePlus,
	Phone,
	Truck,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatDate, formatVND } from "@/lib/format";
import { getProduct } from "@/lib/products";
import {
	type Purchase,
	type PurchaseStatus,
	purchaseLineBaseQty,
	purchaseLineTotal,
	purchasePaymentLabel,
	purchaseStatusBadgeClass,
	purchaseStatusLabel,
	purchaseSubtotal,
	purchaseTotal,
	supplierLabel,
} from "@/lib/purchases";
import { getSupplier } from "@/lib/suppliers";

/**
 * Chi tiết phiếu nhập (DESIGN.md §24 — trang riêng, không modal).
 * Phiếu Nháp: Hoàn thành / Hủy. Phiếu Hoàn thành: chỉ Hủy (inline confirm §21).
 * Hiển thị lô/HSD từng dòng và tổng quy đổi Base Unit.
 * FE-only: đổi trạng thái cục bộ, chưa nối API.
 */
export function PurchaseDetail({ purchase: initial }: { purchase: Purchase }) {
	const router = useRouter();
	const [purchase, setPurchase] = useState<Purchase>(initial);
	const [confirmCancel, setConfirmCancel] = useState(false);

	const supplier = getSupplier(purchase.supplierId);
	const subtotal = purchaseSubtotal(purchase);
	const total = purchaseTotal(purchase);

	function setStatus(status: PurchaseStatus) {
		// TODO: gọi API cập nhật (Completed cộng tồn theo Base Unit / Cancelled hoàn tồn).
		setPurchase((p) => ({ ...p, status }));
		setConfirmCancel(false);
	}

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-28 lg:mx-0 lg:pb-0">
			{/* Header */}
			<div className="flex items-start gap-3">
				<button
					type="button"
					onClick={() => router.push("/nhap-hang")}
					aria-label="Quay lại danh sách"
					className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
				>
					<ArrowLeft className="size-5" aria-hidden />
				</button>
				<div className="flex flex-1 flex-col gap-1 pt-0.5">
					<div className="flex items-center gap-2.5">
						<h1 className="text-2xl font-bold tracking-tight text-foreground">
							{purchase.code}
						</h1>
						<span
							className={`rounded-full px-3 py-1 text-sm font-semibold ${purchaseStatusBadgeClass[purchase.status]}`}
						>
							{purchaseStatusLabel[purchase.status]}
						</span>
					</div>
					<p className="text-base text-[#616161]">
						Ngày nhập {formatDate(purchase.createdAt)} ·{" "}
						{purchasePaymentLabel[purchase.payment]}
					</p>
				</div>
			</div>

			{/* Nhà cung cấp */}
			<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
					Nhà cung cấp
				</h2>
				<div className="flex items-center gap-3">
					<span
						className="flex size-12 items-center justify-center rounded-full text-white"
						style={{ backgroundColor: "#5cad45" }}
					>
						<Truck className="size-6" aria-hidden />
					</span>
					<div className="flex min-w-0 flex-col">
						<span className="text-lg font-semibold text-foreground">
							{supplierLabel(purchase)}
						</span>
						{supplier?.phone ? (
							<span className="flex items-center gap-1.5 text-sm text-[#616161]">
								<Phone className="size-4" aria-hidden />
								{supplier.phone}
							</span>
						) : null}
					</div>
				</div>
			</section>

			{/* Danh sách hàng nhập */}
			<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
					Hàng nhập ({purchase.lines.length})
				</h2>
				<ul className="flex flex-col divide-y divide-border">
					{purchase.lines.map((l) => {
						const product = getProduct(l.productId);
						return (
							<li
								key={`${l.productId}-${l.batch ?? ""}-${l.expiry ?? ""}`}
								className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0"
							>
								<span
									className="flex size-10 shrink-0 items-center justify-center rounded-[10px]"
									style={{ backgroundColor: "#5cad45" }}
								>
									<PackagePlus className="size-5 text-white" aria-hidden />
								</span>
								<div className="flex min-w-0 flex-1 flex-col gap-1">
									<span className="text-base font-semibold text-foreground">
										{l.name}
									</span>
									<span className="text-sm text-[#9e9e9e]">
										{formatVND(l.cost)}₫ × {l.qty} {l.unit}
										{product
											? ` = ${new Intl.NumberFormat("vi-VN").format(purchaseLineBaseQty(l))} ${product.baseUnit}`
											: ""}
									</span>
									{/* Lô + HSD */}
									{l.batch || l.expiry ? (
										<div className="mt-0.5 flex flex-wrap gap-2">
											{l.batch ? (
												<span className="inline-flex items-center gap-1 rounded-full bg-[#f5f5f5] px-2.5 py-0.5 text-xs font-medium text-[#616161]">
													<Layers className="size-3.5" aria-hidden />
													Lô {l.batch}
												</span>
											) : null}
											{l.expiry ? (
												<span className="inline-flex items-center gap-1 rounded-full bg-[#fff8e1] px-2.5 py-0.5 text-xs font-medium text-[#f57f17]">
													<CalendarClock className="size-3.5" aria-hidden />
													HSD {formatDate(l.expiry)}
												</span>
											) : null}
										</div>
									) : null}
								</div>
								<span className="whitespace-nowrap text-base font-bold text-foreground">
									{formatVND(purchaseLineTotal(l))}₫
								</span>
							</li>
						);
					})}
				</ul>
			</section>

			{/* Tổng kết */}
			<section className="flex flex-col gap-2.5 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<div className="flex items-center justify-between text-base text-[#616161]">
					<span>Tiền hàng</span>
					<span className="font-medium text-foreground">
						{formatVND(subtotal)}₫
					</span>
				</div>
				{purchase.discount > 0 ? (
					<div className="flex items-center justify-between text-base text-[#616161]">
						<span>Chiết khấu</span>
						<span className="font-medium text-[#f57f17]">
							−{formatVND(purchase.discount)}₫
						</span>
					</div>
				) : null}
				{purchase.shipping > 0 ? (
					<div className="flex items-center justify-between text-base text-[#616161]">
						<span>Vận chuyển</span>
						<span className="font-medium text-foreground">
							+{formatVND(purchase.shipping)}₫
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

			{purchase.note ? (
				<section className="rounded-[16px] border border-border bg-[#fafafa] p-4">
					<p className="text-sm font-semibold text-[#9e9e9e]">Ghi chú</p>
					<p className="mt-1 text-base text-foreground">{purchase.note}</p>
				</section>
			) : null}

			{/* Hành động — dính đáy mobile, inline desktop */}
			{purchase.status !== "cancelled" ? (
				<div className="fixed inset-x-0 bottom-nav-safe z-30 border-t border-border bg-card px-4 py-3 lg:static lg:border-0 lg:bg-transparent lg:px-0 lg:py-0">
					{confirmCancel ? (
						<div className="flex items-center gap-3">
							<span className="flex-1 text-base font-medium text-foreground">
								Hủy phiếu này?
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
								Hủy phiếu
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
								Hủy phiếu
							</button>
							{purchase.status === "draft" ? (
								<button
									type="button"
									onClick={() => setStatus("completed")}
									className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[10px] bg-primary text-lg font-bold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530] lg:h-12 lg:flex-none lg:px-8"
								>
									<CheckCircle2 className="size-6" aria-hidden />
									Hoàn thành nhập
								</button>
							) : null}
						</div>
					)}
				</div>
			) : (
				<Link
					href="/nhap-hang"
					className="flex h-12 items-center justify-center rounded-[10px] border border-border bg-card text-base font-semibold text-foreground hover:bg-[#f5f5f5]"
				>
					Về danh sách phiếu nhập
				</Link>
			)}
		</div>
	);
}
