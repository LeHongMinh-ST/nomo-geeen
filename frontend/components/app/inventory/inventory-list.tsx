"use client";
import { Search, Warehouse } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DataPagination } from "@/components/app/shared/data-pagination";
import { ListFilterBar } from "@/components/app/shared/list-filter-bar";
import { ListSkeleton } from "@/components/app/shared/list-skeleton";
import { formatVND } from "@/lib/format";
import {
	type InventoryListItem,
	listTenantInventory,
} from "@/lib/tenant-inventory-api";

type StockFilter = "all" | "in-stock" | "low-stock" | "out-of-stock";
type ExpiryFilter = "all" | "expiring" | "expired";
function expiryStatus(item: InventoryListItem): "expiring" | "expired" | null {
	if (!item.nextExpiry) return null;
	const expiry = new Date(item.nextExpiry).getTime();
	return expiry < Date.now()
		? "expired"
		: expiry <= Date.now() + 30 * 86400000
			? "expiring"
			: null;
}
const stockFilters = [
	{ value: "all", label: "Tất cả" },
	{ value: "in-stock", label: "Còn hàng" },
	{ value: "low-stock", label: "Sắp hết" },
	{ value: "out-of-stock", label: "Hết hàng" },
];
const expiryFilters: Array<{ value: ExpiryFilter; label: string }> = [
	{ value: "all", label: "Mọi HSD" },
	{ value: "expiring", label: "Sắp hết hạn" },
	{ value: "expired", label: "Đã hết hạn" },
];
function stockStatus(item: InventoryListItem): Exclude<StockFilter, "all"> {
	const qty = Number(item.qty);
	return qty <= 0 ? "out-of-stock" : qty <= 10 ? "low-stock" : "in-stock";
}
function badge(status: Exclude<StockFilter, "all">) {
	return status === "out-of-stock"
		? "bg-[#ffebee] text-[#c62828]"
		: status === "low-stock"
			? "bg-[#fff8e1] text-[#f57f17]"
			: "bg-[#e8f5e9] text-[#2e7d32]";
}
function statusLabel(status: Exclude<StockFilter, "all">) {
	return status === "out-of-stock"
		? "Hết hàng"
		: status === "low-stock"
			? "Sắp hết"
			: "Còn hàng";
}
export function InventoryList() {
	const [items, setItems] = useState<InventoryListItem[]>([]);
	const [query, setQuery] = useState("");
	const [stock, setStock] = useState<StockFilter>("all");
	const [expiry, setExpiry] = useState<ExpiryFilter>("all");
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
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
	const filtered = useMemo(
		() =>
			items
				.filter((i) => stock === "all" || stockStatus(i) === stock)
				.filter((i) => expiry === "all" || expiryStatus(i) === expiry),
		[items, stock, expiry],
	);
	const lowCount = items.filter((i) => stockStatus(i) === "low-stock").length;
	const outCount = items.filter(
		(i) => stockStatus(i) === "out-of-stock",
	).length;
	const expiringCount = items.filter(
		(i) => expiryStatus(i) === "expiring",
	).length;
	const expiredCount = items.filter(
		(i) => expiryStatus(i) === "expired",
	).length;
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
				<AlertTile
					label="Sắp hết hạn"
					count={expiringCount}
					onClick={() => setExpiry("expiring")}
					tone="warning"
				/>
				<AlertTile
					label="Đã hết hạn"
					count={expiredCount}
					onClick={() => setExpiry("expired")}
					tone="error"
				/>
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
						options: expiryFilters,
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
		</div>
	);
}
function InventoryCard({ item }: { item: InventoryListItem }) {
	const status = stockStatus(item);
	return (
		<Link
			href={`/ton-kho/${item.productId}`}
			className="flex items-start gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card"
		>
			<span className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-[#5cad45]">
				<Warehouse className="size-6 text-white" aria-hidden />
			</span>
			<div className="min-w-0 flex-1">
				<div className="flex items-start justify-between gap-2">
					<p className="font-semibold text-foreground">{item.productName}</p>
					<span
						className={
							"rounded-full px-2.5 py-0.5 text-xs font-semibold " +
							badge(status)
						}
					>
						{statusLabel(status)}
					</span>
				</div>
				<p className="text-sm text-[#616161]">{item.sku}</p>
				{item.nextExpiry ? (
					<p className="mt-1 text-xs text-[#616161]">
						HSD gần nhất:{" "}
						{new Date(item.nextExpiry).toLocaleDateString("vi-VN")}
					</p>
				) : null}
				<div className="mt-2 flex justify-between text-sm">
					<span>
						Tồn:{" "}
						<b>
							{formatVND(Number(item.qty))} {item.baseUnit}
						</b>
					</span>
					<b>{formatVND(Number(item.qty) * Number(item.avgCost))}₫</b>
				</div>
			</div>
		</Link>
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
