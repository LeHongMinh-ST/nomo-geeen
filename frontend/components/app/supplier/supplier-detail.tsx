"use client";

import {
	ArrowLeft,
	Building2,
	MapPin,
	PackagePlus,
	Pencil,
	Phone,
	Trash2,
	Truck,
	User,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
	debtOutstanding,
	debtStatus,
	debtStatusBadgeClass,
	debtStatusLabel,
	getDebt,
} from "@/lib/debts";
import { formatDate, formatVND } from "@/lib/format";
import {
	purchaseItemCount,
	purchaseStatusBadgeClass,
	purchaseStatusLabel,
	purchases,
	purchaseTotal,
} from "@/lib/purchases";
import { type Supplier, supplierTypeLabel } from "@/lib/suppliers";

/**
 * Chi tiết nhà cung cấp (DESIGN.md §24 — trang riêng, không modal).
 * Gắn công nợ phải trả (payables) + lịch sử nhập hàng (purchases theo supplierId).
 * FE-only: xóa cục bộ, chưa nối API.
 */
export function SupplierDetail({ supplier }: { supplier: Supplier }) {
	const router = useRouter();
	const [confirmDelete, setConfirmDelete] = useState(false);

	// Công nợ phải trả: payable account dùng chung id với supplier.
	const debtAccount = getDebt(supplier.id);
	const outstanding = debtAccount ? debtOutstanding(debtAccount) : 0;
	const hasDebt = outstanding > 0;

	// Lịch sử nhập hàng từ NCC này.
	const supplierPurchases = purchases
		.filter((p) => p.supplierId === supplier.id)
		.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

	const hasPolicy =
		supplier.discountPercent != null ||
		supplier.creditLimit != null ||
		Boolean(supplier.paymentTerm) ||
		Boolean(supplier.taxCode);

	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-28 lg:mx-0 lg:pb-0">
			{/* Header */}
			<div className="flex items-start gap-3">
				<button
					type="button"
					onClick={() => router.push("/nha-cung-cap")}
					aria-label="Quay lại danh sách"
					className="flex size-11 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
				>
					<ArrowLeft className="size-5" aria-hidden />
				</button>
				<div className="flex flex-1 items-center gap-3">
					<span
						className="flex size-14 shrink-0 items-center justify-center rounded-[14px]"
						style={{ backgroundColor: "#1a6fa8" }}
					>
						<Truck className="size-7 text-white" aria-hidden />
					</span>
					<div className="flex min-w-0 flex-col gap-0.5">
						<div className="flex items-center gap-2">
							<h1 className="truncate text-2xl font-bold tracking-tight text-foreground">
								{supplier.name}
							</h1>
						</div>
						<p className="text-base text-[#616161]">
							{supplier.code} · {supplierTypeLabel[supplier.type]}
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
					href={`tel:${supplier.phone}`}
					className="flex items-center gap-3 text-base text-foreground"
				>
					<Phone className="size-5 text-[#1a6fa8]" aria-hidden />
					<span className="font-semibold">{supplier.phone}</span>
				</a>
				{supplier.contact ? (
					<div className="flex items-center gap-3 text-base text-foreground">
						<User className="size-5 text-[#9e9e9e]" aria-hidden />
						<span>
							{supplier.contact}
							{supplier.contactRole ? (
								<span className="text-[#9e9e9e]">
									{" "}
									· {supplier.contactRole}
								</span>
							) : null}
						</span>
					</div>
				) : null}
				{supplier.address ? (
					<div className="flex items-start gap-3 text-base text-foreground">
						<MapPin className="mt-0.5 size-5 text-[#9e9e9e]" aria-hidden />
						<span>{supplier.address}</span>
					</div>
				) : null}
				{supplier.taxCode ? (
					<div className="flex items-center gap-3 text-base text-foreground">
						<Building2 className="size-5 text-[#9e9e9e]" aria-hidden />
						<span>
							MST: <span className="font-medium">{supplier.taxCode}</span>
						</span>
					</div>
				) : null}
			</section>

			{/* Chính sách hợp tác */}
			{hasPolicy ? (
				<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
					<h2 className="text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
						Chính sách hợp tác
					</h2>
					<dl className="flex flex-col gap-2.5">
						{supplier.discountPercent != null ? (
							<Row label="Chiết khấu" value={`${supplier.discountPercent}%`} />
						) : null}
						{supplier.creditLimit != null ? (
							<Row
								label="Hạn mức công nợ"
								value={`${formatVND(supplier.creditLimit)}₫`}
							/>
						) : null}
						{supplier.paymentTerm ? (
							<Row label="Thanh toán" value={supplier.paymentTerm} />
						) : null}
					</dl>
				</section>
			) : null}

			{/* Công nợ phải trả */}
			<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<div className="flex items-center justify-between">
					<h2 className="text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
						Công nợ phải trả
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
						Đang nợ NCC
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
						href={`/cong-no/${supplier.id}`}
						className="flex h-12 items-center justify-center gap-2 rounded-[10px] bg-primary text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530]"
					>
						<Wallet className="size-5" aria-hidden />
						Trả tiền
					</Link>
				) : (
					<p className="text-base text-[#616161]">Không còn nợ nhà cung cấp.</p>
				)}
			</section>

			{/* Lịch sử nhập hàng */}
			<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
					Lịch sử nhập hàng ({supplierPurchases.length})
				</h2>
				{supplierPurchases.length === 0 ? (
					<div className="flex flex-col items-center gap-2 py-6 text-center">
						<PackagePlus className="size-8 text-[#9e9e9e]" aria-hidden />
						<p className="text-base text-[#616161]">Chưa có phiếu nhập nào.</p>
					</div>
				) : (
					<ul className="flex flex-col divide-y divide-border">
						{supplierPurchases.map((p) => (
							<li key={p.id}>
								<Link
									href={`/nhap-hang/${p.id}`}
									className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"
								>
									<span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#e0f2f1]">
										<PackagePlus
											className="size-5 text-[#1a6fa8]"
											aria-hidden
										/>
									</span>
									<div className="flex min-w-0 flex-1 flex-col gap-0.5">
										<div className="flex items-center gap-2">
											<span className="text-base font-semibold text-foreground">
												{p.code}
											</span>
											<span
												className={`rounded-full px-2 py-0.5 text-xs font-semibold ${purchaseStatusBadgeClass[p.status]}`}
											>
												{purchaseStatusLabel[p.status]}
											</span>
										</div>
										<span className="text-sm text-[#9e9e9e]">
											{formatDate(p.createdAt)} · {purchaseItemCount(p)} mặt
											hàng
										</span>
									</div>
									<span className="whitespace-nowrap text-base font-bold text-foreground">
										{formatVND(purchaseTotal(p))}₫
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
							Xóa nhà cung cấp này?
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
							onClick={() => router.push("/nha-cung-cap")}
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
							href={`/nha-cung-cap/${supplier.id}/sua`}
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

function Row({ label, value }: { label: string; value: string }) {
	return (
		<div className="flex items-center justify-between gap-3">
			<dt className="text-base text-[#616161]">{label}</dt>
			<dd className="text-base font-semibold text-foreground">{value}</dd>
		</div>
	);
}
