"use client";
import { ArrowLeft, History, Warehouse } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatDate, formatVND } from "@/lib/format";
import {
	getTenantInventoryDetail,
	type InventoryDetail as InventoryDetailData,
} from "@/lib/tenant-inventory-api";
export function InventoryDetail({ productId }: { productId: string }) {
	const router = useRouter();
	const [item, setItem] = useState<InventoryDetailData | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	useEffect(() => {
		let active = true;
		setLoading(true);
		getTenantInventoryDetail(productId)
			.then((value) => {
				if (active) {
					setItem(value);
					setError(null);
				}
			})
			.catch((reason) => {
				if (active)
					setError(
						reason instanceof Error
							? reason.message
							: "Không thể tải chi tiết tồn kho",
					);
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [productId]);
	if (loading)
		return (
			<div className="rounded-[16px] border border-border bg-card px-6 py-14 text-center">
				Đang tải tồn kho...
			</div>
		);
	if (error || !item)
		return (
			<div
				role="alert"
				className="rounded-[16px] border border-dashed border-destructive bg-card px-6 py-14 text-center text-destructive"
			>
				{error ?? "Không tìm thấy sản phẩm"}
			</div>
		);
	const qty = Number(item.qty);
	const cost = Number(item.avgCost);
	return (
		<div className="mx-auto flex w-full max-w-2xl flex-col gap-5 pb-28 lg:mx-0">
			<div className="flex items-start gap-3">
				<button
					type="button"
					onClick={() => router.push("/ton-kho")}
					aria-label="Quay lại danh sách"
					className="flex size-11 items-center justify-center rounded-[10px] border border-border bg-card"
				>
					<ArrowLeft className="size-5" aria-hidden />
				</button>
				<div>
					<h1 className="text-2xl font-bold text-foreground">
						{item.productName}
					</h1>
					<p className="text-base text-[#616161]">{item.sku}</p>
				</div>
			</div>
			<section className="grid grid-cols-2 gap-3">
				<div className="rounded-[16px] border border-border bg-card p-5">
					<span className="text-sm text-[#616161]">Tồn kho</span>
					<p className="text-[26px] font-bold">
						{formatVND(qty)}{" "}
						<span className="text-base font-medium text-[#9e9e9e]">
							{item.baseUnit}
						</span>
					</p>
				</div>
				<div className="rounded-[16px] border border-border bg-card p-5">
					<span className="text-sm text-[#616161]">Giá trị tồn</span>
					<p className="text-[26px] font-bold">{formatVND(qty * cost)}₫</p>
					<p className="text-sm text-[#616161]">
						Giá vốn bình quân: {formatVND(cost)}₫/{item.baseUnit}
					</p>
				</div>
			</section>
			<section className="rounded-[16px] border border-border bg-card p-5">
				<h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
					Lô hàng
				</h2>
				{item.batches.length === 0 ? (
					<p className="text-base text-[#616161]">Chưa có lô hàng còn tồn.</p>
				) : (
					<ul className="divide-y divide-border">
						{item.batches.map((batch) => (
							<li
								key={batch.id}
								className="flex items-center justify-between gap-3 py-3"
							>
								<span>
									<b>{batch.batchCode}</b>
									{batch.expiresAt ? (
										<span className="ml-2 text-sm text-[#616161]">
											HSD {formatDate(batch.expiresAt)}
										</span>
									) : null}
								</span>
								<span className="font-semibold">
									{formatVND(Number(batch.qtyOnHand))} {item.baseUnit}
								</span>
							</li>
						))}
					</ul>
				)}
			</section>
			<section className="rounded-[16px] border border-border bg-card p-5">
				<h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-[#9e9e9e]">
					<History className="size-4" aria-hidden />
					Lịch sử biến động
				</h2>
				{item.movements.length === 0 ? (
					<p className="text-base text-[#616161]">Chưa có biến động.</p>
				) : (
					<ul className="divide-y divide-border">
						{item.movements.map((movement) => (
							<li
								key={movement.id}
								className="flex items-center justify-between gap-3 py-3"
							>
								<span>
									<b>{movement.direction === "IN" ? "Nhập kho" : "Xuất kho"}</b>
									<span className="ml-2 text-sm text-[#616161]">
										{movement.reason}
									</span>
									<span className="block text-xs text-[#9e9e9e]">
										{formatDate(movement.occurredAt)}
									</span>
								</span>
								<span className="font-semibold">
									{movement.direction === "IN" ? "+" : "−"}
									{formatVND(Number(movement.qty))} {item.baseUnit}
								</span>
							</li>
						))}
					</ul>
				)}
			</section>
			<div className="rounded-[10px] border border-dashed border-border bg-card px-4 py-3 text-sm text-[#616161]">
				<Warehouse className="mr-2 inline size-4" aria-hidden />
				Kiểm kê/điều chỉnh sẽ được triển khai ở scope riêng.
			</div>
		</div>
	);
}
