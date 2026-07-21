"use client";

import { ArrowLeft, MapPin, Pencil, Phone, Trash2, Wallet } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatVND } from "@/lib/format";
import {
	type Customer,
	customerTypeLabel,
	deleteCustomer,
} from "@/lib/tenant-customers-api";

export function CustomerDetail({ customer }: { customer: Customer }) {
	const router = useRouter();
	const [deleting, setDeleting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const hasDebt = customer.balance > 0;
	async function handleDelete() {
		if (
			!window.confirm("Xóa khách hàng này? Dữ liệu lịch sử vẫn được giữ lại.")
		)
			return;
		setDeleting(true);
		setError(null);
		try {
			await deleteCustomer(customer.id);
			router.push("/khach-hang");
		} catch {
			setError("Không thể xóa khách hàng. Vui lòng thử lại.");
		} finally {
			setDeleting(false);
		}
	}
	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-24 lg:mx-0 lg:pb-0">
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={() => router.push("/khach-hang")}
					className="flex size-11 items-center justify-center rounded-[10px] border border-border bg-card"
				>
					<ArrowLeft className="size-5" />
				</button>
				<div>
					<h1 className="text-2xl font-bold">{customer.name}</h1>
					<p className="text-[#616161]">
						{customer.type
							? customerTypeLabel[customer.type]
							: "Chưa phân loại"}
					</p>
				</div>
			</div>
			<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
					Thông tin liên hệ
				</h2>
				{customer.phone ? (
					<a href={`tel:${customer.phone}`} className="flex items-center gap-3">
						<Phone className="size-5 text-[#1a6fa8]" />
						{customer.phone}
					</a>
				) : (
					<p className="text-[#616161]">Chưa có số điện thoại</p>
				)}
				{customer.address ? (
					<div className="flex items-start gap-3">
						<MapPin className="mt-0.5 size-5 text-[#9e9e9e]" />
						{customer.address}
					</div>
				) : null}
			</section>
			<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
					Công nợ hiện tại
				</h2>
				<div className="flex items-end justify-between gap-3">
					<span className="flex items-center gap-2 text-[#616161]">
						<Wallet className="size-5 text-[#1a6fa8]" />
						{hasDebt ? "Khách đang nợ" : "Không còn nợ"}
					</span>
					<span
						className={`text-[26px] font-bold ${hasDebt ? "text-[#f57f17]" : "text-[#2e7d32]"}`}
					>
						{formatVND(customer.balance)}₫
					</span>
				</div>
				<p className="text-sm text-[#616161]">
					Số dư do máy chủ cung cấp, chỉ đọc.
				</p>
			</section>
			{error ? (
				<p
					role="alert"
					className="rounded-[10px] border border-destructive/30 bg-[#fff5f4] p-3 text-sm text-destructive"
				>
					{error}
				</p>
			) : null}
			<div className="fixed inset-x-0 bottom-nav-safe z-20 flex items-center gap-3 border-t border-border bg-card p-3 lg:static lg:border-0 lg:bg-transparent lg:p-0">
				<button
					type="button"
					disabled={deleting}
					onClick={() => void handleDelete()}
					className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[10px] border border-border text-destructive disabled:opacity-60"
				>
					<Trash2 className="size-5" />
					Xóa
				</button>
				<Link
					href={`/khach-hang/${customer.id}/sua`}
					className="flex h-12 flex-1 items-center justify-center gap-2 rounded-[10px] bg-primary font-semibold text-white"
				>
					<Pencil className="size-5" />
					Sửa thông tin
				</Link>
			</div>
		</div>
	);
}
