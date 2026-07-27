"use client";
import { Search, Warehouse } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AdjustmentList } from "@/components/app/inventory/adjustment-list";
import {
	InventoryCard,
	stockStatusOf,
} from "@/components/app/inventory/inventory-card";
import { DataPagination } from "@/components/app/shared/data-pagination";
import { ListFilterBar } from "@/components/app/shared/list-filter-bar";
import { ListSkeleton } from "@/components/app/shared/list-skeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { type ExpiryFilter, expiryFilterOptions } from "@/lib/inventory";
import {
	getTenantInventoryExpirySummary,
	type InventoryExpirySummary,
	type InventoryListItem,
	listTenantInventory,
} from "@/lib/tenant-inventory-api";

type StockFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";
const stockFilters = [
	{ value: "all", label: "Tất cả" },
	{ value: "in-stock", label: "Còn hàng" },
	{ value: "low-stock", label: "Sắp hết" },
	{ value: "out-of-stock", label: "Hết hàng" },
];
export function InventoryList() {
	const [items, setItems] = useState<InventoryListItem[]>([]);
	const [query, setQuery] = useState("");
	const [stock, setStock] = useState<StockFilter>("all");
	const [expiry, setExpiry] = useState<ExpiryFilter>("all");
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [summary, setSummary] = useState<InventoryExpirySummary | null>(null);
	const [summaryLoading, setSummaryLoading] = useState(true);
	const [summaryError, setSummaryError] = useState<string | null>(null);
	const [summaryTick, setSummaryTick] = useState(0);
	useEffect(() => {
		let active = true;
		setLoading(true);
		listTenantInventory({ page, pageSize: 20, search: query || undefined })
			.then((r) => {
				if (active) {
					setItems(r.items);
					setTotal(r.total);
					setError(null);
				}
			})
			.catch((e) => {
				if (active)
					setError(e instanceof Error ? e.message : "Không thể tải tồn kho");
			})
			.finally(() => {
				if (active) setLoading(false);
			});
		return () => {
			active = false;
		};
	}, [page, query]);
	// Tenant-wide (all pages) — tiles must count every batch/item, not just this page.
	useEffect(() => {
		let active = true;
		void summaryTick;
		setSummaryLoading(true);
		setSummaryError(null);
		getTenantInventoryExpirySummary()
			.then((r) => {
				if (active) {
					setSummary(r);
					setSummaryError(null);
				}
			})
			.catch((e) => {
				if (active)
					setSummaryError(
						e instanceof Error
							? e.message
							: "Không thể tải cảnh báo hạn sử dụng",
					);
			})
			.finally(() => {
				if (active) setSummaryLoading(false);
			});
		return () => {
			active = false;
		};
	}, [summaryTick]);
	const filtered = useMemo(
		() =>
			items
				.filter((i) => stock === "all" || stockStatusOf(i) === stock)
				.filter((i) => expiry === "all" || i.expiryTier === expiry),
		[items, stock, expiry],
	);
	const lowCount = items.filter((i) => stockStatusOf(i) === "low-stock").length;
	const outCount = items.filter(
		(i) => stockStatusOf(i) === "out-of-stock",
	).length;
	const criticalCount = summary?.items.byTier.CRITICAL ?? 0;
	const expiredCount = summary?.items.byTier.EXPIRED ?? 0;
	if (loading) return <ListSkeleton withToolbar rows={6} />;
	if (error)
		return (
			<div
				role="alert"
				className="rounded-[16px] border border-dashed border-destructive bg-card px-6 py-14 text-center text-destructive"
			>
				<p>{error}</p>
				<button
					type="button"
					onClick={() => setPage((p) => p)}
					className="mt-4 rounded-[10px] bg-primary px-4 py-2 font-semibold text-white"
				>
					Thử lại
				</button>
			</div>
		);
	return (
		<div className="flex w-full flex-col gap-5">
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-bold tracking-tight text-foreground">
						Tồn kho
					</h1>
					<span className="rounded-full bg-[#e3f2fd] px-2.5 py-0.5 text-sm font-semibold text-[#1565c0]">
						{total}
					</span>
				</div>
				<p className="text-base text-[#616161]">
					Số lượng tồn và giá vốn theo dữ liệu tenant.
				</p>
			</div>
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<AlertTile
					label="Sắp hết"
					count={lowCount}
					onClick={() => setStock("low-stock")}
					tone="warning"
				/>
				<AlertTile
					label="Hết hàng"
					count={outCount}
					onClick={() => setStock("out-of-stock")}
					tone="error"
				/>
				{summaryLoading ? (
					<>
						<Skeleton className="h-[68px] rounded-[14px]" />
						<Skeleton className="h-[68px] rounded-[14px]" />
					</>
				) : summaryError ? (
					<ExpirySummaryError
						message={summaryError}
						onRetry={() => setSummaryTick((n) => n + 1)}
					/>
				) : (
					<>
						<AlertTile
							label="Còn dưới 30 ngày"
							count={criticalCount}
							onClick={() => setExpiry("CRITICAL")}
							tone="warning"
						/>
						<AlertTile
							label="Đã hết hạn"
							count={expiredCount}
							onClick={() => setExpiry("EXPIRED")}
							tone="error"
						/>
					</>
				)}
			</div>
			<div className="relative">
				<Search
					className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-[#9e9e9e]"
					aria-hidden
				/>
				<input
					type="search"
					value={query}
					onChange={(e) => {
						setPage(1);
						setQuery(e.target.value);
					}}
					placeholder="Tìm tên, mã SKU..."
					className="h-12 w-full rounded-[10px] border border-border bg-white pl-11 pr-4 text-base"
				/>
			</div>
			<ListFilterBar
				groups={[
					{
						key: "stock",
						label: "Trạng thái tồn",
						value: stock,
						options: stockFilters,
						onChange: (v) => setStock(v as StockFilter),
					},
					{
						key: "expiry",
						label: "Hạn sử dụng",
						value: expiry,
						options: expiryFilterOptions,
						onChange: (v) => setExpiry(v as ExpiryFilter),
					},
				]}
			/>
			{filtered.length === 0 ? (
				<EmptyState />
			) : (
				<>
					<div className="grid gap-3 lg:grid-cols-2">
						{filtered.map((item) => (
							<InventoryCard key={item.productId} item={item} />
						))}
					</div>
					<DataPagination
						page={page}
						pageCount={Math.max(1, Math.ceil(total / 20))}
						total={total}
						pageSize={20}
						noun="mặt hàng"
						onPage={setPage}
					/>
				</>
			)}
			<AdjustmentList />
		</div>
	);
}
function AlertTile({
	label,
	count,
	tone,
	onClick,
}: {
	label: string;
	count: number;
	tone: "warning" | "error";
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={
				"flex flex-col items-start rounded-[14px] px-4 py-3 text-left " +
				(tone === "error"
					? "bg-[#ffebee] text-[#c62828]"
					: "bg-[#fff8e1] text-[#f57f17]")
			}
		>
			<span className="text-[26px] font-bold leading-none">{count}</span>
			<span className="text-sm font-medium">{label}</span>
		</button>
	);
}
function ExpirySummaryError({
	message,
	onRetry,
}: {
	message: string;
	onRetry: () => void;
}) {
	return (
		<div
			role="alert"
			className="col-span-2 flex flex-col items-start gap-1 rounded-[14px] bg-[#ffebee] px-4 py-3 text-left text-[#c62828]"
		>
			<span className="text-sm font-medium">{message}</span>
			<button
				type="button"
				onClick={onRetry}
				className="text-sm font-semibold underline"
			>
				Thử lại
			</button>
		</div>
	);
}
function EmptyState() {
	return (
		<div className="rounded-[16px] border border-dashed border-border bg-card px-6 py-14 text-center">
			<Warehouse className="mx-auto size-8 text-[#9e9e9e]" aria-hidden />
			<h2 className="mt-3 text-lg font-semibold">Chưa có dữ liệu tồn kho</h2>
			<p className="mt-1 text-base text-[#616161]">
				Hoàn thành phiếu nhập để cập nhật tồn kho.
			</p>
		</div>
	);
}
