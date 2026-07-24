"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DataPagination } from "@/components/app/shared/data-pagination";
import { ListFilterBar } from "@/components/app/shared/list-filter-bar";
import { ListSkeleton } from "@/components/app/shared/list-skeleton";
import { formatDate } from "@/lib/format";
import {
	listTenantStockAdjustments,
	type StockAdjustment,
	type StockAdjustmentStatus,
} from "@/lib/tenant-stock-adjustments-api";

const filters = [
	{ value: "all", label: "Tất cả" },
	{ value: "DRAFT", label: "Bản nháp" },
	{ value: "COMPLETED", label: "Đã hoàn tất" },
];

export function AdjustmentList() {
	const [items, setItems] = useState<StockAdjustment[]>([]);
	const [status, setStatus] = useState<"all" | StockAdjustmentStatus>("all");
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let active = true;
		setLoading(true);
		listTenantStockAdjustments({
			page,
			pageSize: 20,
			status: status === "all" ? undefined : status,
		})
			.then((result) => {
				if (active) {
					setItems(result.items);
					setTotal(result.total);
					setError(null);
				}
			})
			.catch((reason) => {
				if (active)
					setError(
						reason instanceof Error
							? reason.message
							: "Không thể tải lịch sử điều chỉnh",
					);
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [page, status]);

	return (
		<section
			className="flex w-full flex-col gap-4"
			aria-labelledby="adjustment-list-title"
		>
			<div className="flex items-end justify-between gap-3">
				<div>
					<h2 id="adjustment-list-title" className="text-xl font-bold">
						Phiếu điều chỉnh
					</h2>
					<p className="text-sm text-[#616161]">Lịch sử thay đổi tồn kho</p>
				</div>
			</div>
			<ListFilterBar
				groups={[
					{
						key: "status",
						label: "Trạng thái",
						value: status,
						options: filters,
						onChange: (value) => {
							setPage(1);
							setStatus(value as "all" | StockAdjustmentStatus);
						},
					},
				]}
			/>
			{loading ? (
				<ListSkeleton rows={3} />
			) : error ? (
				<div
					role="alert"
					className="rounded-[16px] border border-dashed border-destructive bg-card px-6 py-10 text-center text-destructive"
				>
					{error}
				</div>
			) : items.length === 0 ? (
				<div className="rounded-[16px] border border-dashed border-border bg-card px-6 py-10 text-center text-[#616161]">
					Chưa có phiếu điều chỉnh.
				</div>
			) : (
				<div className="grid gap-3 lg:grid-cols-2">
					{items.map((item) => (
						<AdjustmentCard key={item.id} item={item} />
					))}
				</div>
			)}
			{!loading && !error && items.length > 0 ? (
				<DataPagination
					page={page}
					pageCount={Math.max(1, Math.ceil(total / 20))}
					total={total}
					pageSize={20}
					noun="phiếu"
					onPage={setPage}
				/>
			) : null}
		</section>
	);
}

function AdjustmentCard({ item }: { item: StockAdjustment }) {
	const productId = item.lines[0]?.productId ?? item.id;
	return (
		<Link
			href={`/ton-kho/${productId}?adjustment=${item.id}`}
			className="rounded-[16px] border border-border bg-card p-4 shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5CAD45]"
		>
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="font-semibold">{item.docNo}</p>
					<p className="text-sm text-[#616161]">{formatDate(item.createdAt)}</p>
				</div>
				<span
					role="status"
					aria-label={`Trạng thái ${item.status === "COMPLETED" ? "đã hoàn tất" : "bản nháp"}`}
					className={
						item.status === "COMPLETED"
							? "rounded-full bg-[#e8f5e9] px-2.5 py-1 text-xs font-semibold text-[#2e7d32]"
							: "rounded-full bg-[#fff8e1] px-2.5 py-1 text-xs font-semibold text-[#f57f17]"
					}
				>
					{item.status === "COMPLETED" ? "Đã hoàn tất" : "Bản nháp"}
				</span>
			</div>
			<p className="mt-3 text-sm text-[#616161]">
				{item.lines.length} dòng · Kho {item.warehouseId}
			</p>
		</Link>
	);
}
