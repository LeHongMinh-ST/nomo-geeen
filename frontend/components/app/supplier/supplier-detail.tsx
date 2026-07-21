"use client";

import {
	ArrowLeft,
	Building2,
	MapPin,
	Pencil,
	Phone,
	Trash2,
	Truck,
	User,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatVND } from "@/lib/format";
import {
	deleteTenantSupplier,
	getTenantSupplier,
	supplierTypeLabel,
	type TenantSupplier,
} from "@/lib/tenant-suppliers-api";

export function SupplierDetail({ id }: { id: string }) {
	const router = useRouter();
	const [supplier, setSupplier] = useState<TenantSupplier | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [deleting, setDeleting] = useState(false);
	useEffect(() => {
		void getTenantSupplier(id)
			.then(setSupplier)
			.catch((e) =>
				setError(
					e instanceof Error ? e.message : "Không thể tải nhà cung cấp.",
				),
			)
			.finally(() => setLoading(false));
	}, [id]);
	async function remove() {
		if (
			!window.confirm(
				"Xóa nhà cung cấp này? Lịch sử liên quan vẫn được giữ lại.",
			)
		)
			return;
		setDeleting(true);
		try {
			await deleteTenantSupplier(id);
			router.push("/nha-cung-cap");
		} catch (e) {
			setError(e instanceof Error ? e.message : "Không thể xóa nhà cung cấp.");
			setDeleting(false);
		}
	}
	if (loading)
		return (
			<div className="rounded-[16px] border border-border bg-card p-6 text-base text-[#616161]">
				Đang tải nhà cung cấp...
			</div>
		);
	if (!supplier) return <NotFound error={error} />;
	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-28 lg:mx-0 lg:pb-0">
			<div className="flex items-start gap-3">
				<button
					type="button"
					onClick={() => router.push("/nha-cung-cap")}
					aria-label="Quay lại danh sách"
					className="flex size-11 items-center justify-center rounded-[10px] border border-border bg-card"
				>
					<ArrowLeft className="size-5" aria-hidden />
				</button>
				<div className="flex flex-1 items-center gap-3">
					<span className="flex size-14 items-center justify-center rounded-[14px] bg-[#1a6fa8]">
						<Truck className="size-7 text-white" aria-hidden />
					</span>
					<div className="min-w-0">
						<h1 className="truncate text-2xl font-bold">{supplier.name}</h1>
						<p className="text-base text-[#616161]">
							{supplier.code} · {supplierTypeLabel(supplier.supplierType)}
						</p>
					</div>
				</div>
			</div>
			{error ? (
				<p
					role="alert"
					className="rounded-[10px] bg-[#fff5f4] p-4 text-base text-[#b42318]"
				>
					{error}
				</p>
			) : null}
			<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
					Thông tin liên hệ
				</h2>
				{supplier.phone ? (
					<a
						href={`tel:${supplier.phone}`}
						className="flex items-center gap-3 text-base"
					>
						<Phone className="size-5 text-[#1a6fa8]" aria-hidden />
						{supplier.phone}
					</a>
				) : null}
				{supplier.contactName ? (
					<div className="flex items-center gap-3 text-base">
						<User className="size-5 text-[#9e9e9e]" aria-hidden />
						{supplier.contactName}
					</div>
				) : null}
				{supplier.address ? (
					<div className="flex items-start gap-3 text-base">
						<MapPin className="mt-0.5 size-5 text-[#9e9e9e]" aria-hidden />
						{supplier.address}
					</div>
				) : null}
				{supplier.email ? (
					<div className="flex items-center gap-3 text-base">
						<Building2 className="size-5 text-[#9e9e9e]" aria-hidden />
						{supplier.email}
					</div>
				) : null}
				{supplier.taxCode ? (
					<div className="flex items-center gap-3 text-base">
						<Building2 className="size-5 text-[#9e9e9e]" aria-hidden />
						MST: <span className="font-medium">{supplier.taxCode}</span>
					</div>
				) : null}
			</section>
			<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
				<h2 className="text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
					Công nợ phải trả
				</h2>
				<div className="flex items-center justify-between gap-3">
					<span className="flex items-center gap-2 text-base text-[#616161]">
						<Wallet className="size-5 text-[#1a6fa8]" aria-hidden />
						Đang nợ NCC
					</span>
					<span
						className={`text-[26px] font-bold ${supplier.balance > 0 ? "text-[#f57f17]" : "text-[#2e7d32]"}`}
					>
						{formatVND(supplier.balance)}₫
					</span>
				</div>
				<p className="text-base text-[#616161]">
					Số dư do hệ thống tính toán, chỉ xem.
				</p>
			</section>
			<div className="fixed inset-x-0 bottom-nav-safe z-30 flex gap-3 border-t border-border bg-card px-4 py-3 lg:static lg:border-0 lg:bg-transparent lg:px-0">
				<button
					type="button"
					disabled={deleting}
					onClick={() => void remove()}
					className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[10px] border border-border text-base font-semibold text-destructive lg:h-12 lg:flex-none lg:px-6"
				>
					<Trash2 className="size-5" aria-hidden />
					Xóa
				</button>
				<Link
					href={`/nha-cung-cap/${supplier.id}/sua`}
					className="flex h-14 flex-1 items-center justify-center gap-2 rounded-[10px] bg-primary text-base font-semibold text-white lg:h-12 lg:flex-none lg:px-8"
				>
					<Pencil className="size-5" aria-hidden />
					Sửa thông tin
				</Link>
			</div>
		</div>
	);
}
function NotFound({ error }: { error: string }) {
	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 rounded-[16px] border border-dashed border-border bg-card px-6 py-14 text-center">
			<h1 className="text-lg font-semibold">Không tìm thấy nhà cung cấp</h1>
			<p className="text-base text-[#616161]">
				{error || "Nhà cung cấp có thể đã bị xóa hoặc không tồn tại."}
			</p>
			<Link
				href="/nha-cung-cap"
				className="flex h-12 items-center rounded-[10px] bg-primary px-6 text-base font-semibold text-white"
			>
				Về danh sách nhà cung cấp
			</Link>
		</div>
	);
}
