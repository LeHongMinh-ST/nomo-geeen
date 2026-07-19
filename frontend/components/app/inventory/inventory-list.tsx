"use client";

import { CalendarClock, Search, Warehouse } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { InventoryCard } from "@/components/app/inventory/inventory-card";
import { DataPagination } from "@/components/app/shared/data-pagination";
import { ListFilterBar } from "@/components/app/shared/list-filter-bar";
import { ListSkeleton } from "@/components/app/shared/list-skeleton";
import { LoadMoreSentinel } from "@/components/app/shared/load-more-sentinel";
import { formatDate, formatVND } from "@/lib/format";
import {
	type ExpiryStatus,
	earliestExpiry,
	expiryStatusBadgeClass,
	expiryStatusLabel,
	getInventory,
	getStockStatus,
	inventory,
	itemExpiryStatus,
	type StockStatus,
	products as seedProducts,
	stockStatusBadgeClass,
	stockStatusLabel,
} from "@/lib/inventory";

/**
 * Danh sách tồn kho — responsive (DESIGN.md §12).
 * Mobile: card list + tải dần. Desktop (lg+): bảng + phân trang.
 * Hai bộ lọc segmented: trạng thái tồn + trạng thái HSD.
 */

type StockFilter = "all" | StockStatus;
type ExpiryFilter = "all" | "expiring" | "expired";

const stockFilters: { value: StockFilter; label: string }[] = [
	{ value: "all", label: "Tất cả" },
	{ value: "in-stock", label: "Còn hàng" },
	{ value: "low-stock", label: "Sắp hết" },
	{ value: "out-of-stock", label: "Hết hàng" },
];

const expiryFilters: { value: ExpiryFilter; label: string }[] = [
	{ value: "all", label: "Mọi HSD" },
	{ value: "expiring", label: "Sắp hết hạn" },
	{ value: "expired", label: "Đã hết hạn" },
];

const PAGE_SIZE = 10;
const MOBILE_BATCH = 8;

/** Map productId → trạng thái HSD tổng hợp (tính 1 lần). */
const expiryByProduct = new Map<string, ExpiryStatus>(
	inventory.map((i) => [i.productId, itemExpiryStatus(i)]),
);

export function InventoryList() {
	const [query, setQuery] = useState("");
	const [stock, setStock] = useState<StockFilter>("all");
	const [expiry, setExpiry] = useState<ExpiryFilter>("all");
	const [page, setPage] = useState(1);
	const [mobileCount, setMobileCount] = useState(MOBILE_BATCH);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const timer = setTimeout(() => setLoading(false), 450);
		return () => clearTimeout(timer);
	}, []);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return seedProducts.filter((p) => {
			if (stock !== "all" && getStockStatus(p) !== stock) return false;
			if (expiry !== "all" && expiryByProduct.get(p.id) !== expiry)
				return false;
			if (!q) return true;
			return (
				p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
			);
		});
	}, [query, stock, expiry]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset khi tiêu chí lọc đổi
	useEffect(() => {
		setPage(1);
		setMobileCount(MOBILE_BATCH);
	}, [query, stock, expiry]);

	const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const safePage = Math.min(page, pageCount);
	const pageRows = filtered.slice(
		(safePage - 1) * PAGE_SIZE,
		safePage * PAGE_SIZE,
	);

	const mobileRows = filtered.slice(0, mobileCount);
	const mobileHasMore = mobileCount < filtered.length;

	// Đếm cảnh báo cho khối tóm tắt.
	const lowCount = seedProducts.filter(
		(p) => getStockStatus(p) === "low-stock",
	).length;
	const outCount = seedProducts.filter(
		(p) => getStockStatus(p) === "out-of-stock",
	).length;
	const expiringCount = seedProducts.filter(
		(p) => expiryByProduct.get(p.id) === "expiring",
	).length;
	const expiredCount = seedProducts.filter(
		(p) => expiryByProduct.get(p.id) === "expired",
	).length;

	if (loading) return <ListSkeleton withToolbar rows={6} />;

	return (
		<div className="flex w-full flex-col gap-5">
			{/* Page header */}
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-bold tracking-tight text-foreground">
						Tồn kho
					</h1>
					<span className="rounded-full bg-[#e3f2fd] px-2.5 py-0.5 text-sm font-semibold text-[#1565c0]">
						{seedProducts.length}
					</span>
				</div>
				<p className="text-base text-[#616161]">
					Số lượng tồn, lô và hạn sử dụng theo từng sản phẩm.
				</p>
			</div>

			{/* Khối cảnh báo */}
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<AlertTile
					label="Sắp hết"
					count={lowCount}
					tone="warning"
					onClick={() => setStock("low-stock")}
				/>
				<AlertTile
					label="Hết hàng"
					count={outCount}
					tone="error"
					onClick={() => setStock("out-of-stock")}
				/>
				<AlertTile
					label="Sắp hết hạn"
					count={expiringCount}
					tone="warning"
					onClick={() => setExpiry("expiring")}
				/>
				<AlertTile
					label="Đã hết hạn"
					count={expiredCount}
					tone="error"
					onClick={() => setExpiry("expired")}
				/>
			</div>

			{/* Tìm kiếm */}
			<div className="relative">
				<Search
					className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-[#9e9e9e]"
					aria-hidden
				/>
				<input
					type="search"
					value={query}
					onChange={(e) => setQuery(e.target.value)}
					placeholder="Tìm tên, mã SKU..."
					className="h-12 w-full rounded-[10px] border border-border bg-white pl-11 pr-4 text-base text-foreground placeholder:text-[#9e9e9e] transition-colors duration-200 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 md:h-11"
				/>
			</div>

			{/* Bộ lọc */}
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
					{/* Mobile — card list + tải dần */}
					<div className="flex flex-col gap-3 lg:hidden">
						{mobileRows.map((p) => (
							<InventoryCard
								key={p.id}
								product={p}
								expiryStatus={expiryByProduct.get(p.id) ?? "none"}
							/>
						))}
						{mobileHasMore ? (
							<LoadMoreSentinel
								onReach={() =>
									setMobileCount((c) =>
										Math.min(c + MOBILE_BATCH, filtered.length),
									)
								}
							/>
						) : (
							<p className="py-2 text-center text-sm text-[#9e9e9e]">
								Đã hiển thị tất cả {filtered.length} mặt hàng
							</p>
						)}
					</div>

					{/* Desktop — bảng đầy đủ + phân trang */}
					<div className="hidden flex-col gap-3 lg:flex">
						<div className="overflow-hidden rounded-[16px] border border-border bg-card shadow-card">
							<table className="w-full border-collapse text-left">
								<thead>
									<tr className="bg-[#f5f5f5] text-sm text-[#616161]">
										<th className="min-w-[220px] px-4 py-3 font-semibold">
											Sản phẩm
										</th>
										<th className="min-w-[110px] whitespace-nowrap px-4 py-3 text-right font-semibold">
											Tồn kho
										</th>
										<th className="min-w-[120px] whitespace-nowrap px-4 py-3 text-right font-semibold">
											Giá trị tồn
										</th>
										<th className="min-w-[140px] whitespace-nowrap px-4 py-3 font-semibold">
											HSD gần nhất
										</th>
										<th className="min-w-[110px] whitespace-nowrap px-4 py-3 font-semibold">
											Trạng thái
										</th>
									</tr>
								</thead>
								<tbody>
									{pageRows.map((p) => {
										const st = getStockStatus(p);
										const es = expiryByProduct.get(p.id) ?? "none";
										const item = getInventory(p.id);
										const exp = item ? earliestExpiry(item) : undefined;
										return (
											<tr
												key={p.id}
												className="border-t border-border transition-colors hover:bg-accent"
											>
												<td className="px-4 py-3">
													<Link
														href={`/ton-kho/${p.id}`}
														className="flex items-center gap-3"
													>
														<span
															className="flex size-10 shrink-0 items-center justify-center rounded-[10px]"
															style={{ backgroundColor: "#5cad45" }}
														>
															<Warehouse
																className="size-5 text-white"
																aria-hidden
															/>
														</span>
														<span className="flex min-w-0 flex-col">
															<span className="font-semibold text-foreground">
																{p.name}
															</span>
															<span className="text-sm text-[#9e9e9e]">
																{p.sku}
															</span>
														</span>
													</Link>
												</td>
												<td className="whitespace-nowrap px-4 py-3 text-right text-base text-foreground">
													{formatVND(p.stock)}{" "}
													<span className="text-sm text-[#9e9e9e]">
														{p.baseUnit}
													</span>
												</td>
												<td className="whitespace-nowrap px-4 py-3 text-right text-base font-bold text-foreground">
													{formatVND(p.stock * p.costPrice)}₫
												</td>
												<td className="whitespace-nowrap px-4 py-3">
													{es !== "none" && exp ? (
														<span
															className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-sm font-semibold ${expiryStatusBadgeClass[es]}`}
														>
															<CalendarClock className="size-3.5" aria-hidden />
															{es === "expired"
																? expiryStatusLabel.expired
																: formatDate(exp)}
														</span>
													) : (
														<span className="text-sm text-[#9e9e9e]">—</span>
													)}
												</td>
												<td className="px-4 py-3">
													<span
														className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${stockStatusBadgeClass[st]}`}
													>
														{stockStatusLabel[st]}
													</span>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>

						<DataPagination
							page={safePage}
							pageCount={pageCount}
							total={filtered.length}
							pageSize={PAGE_SIZE}
							noun="mặt hàng"
							onPage={setPage}
						/>
					</div>
				</>
			)}
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
	const cls =
		tone === "error"
			? "bg-[#ffebee] text-[#c62828]"
			: "bg-[#fff8e1] text-[#f57f17]";
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex flex-col items-start gap-0.5 rounded-[14px] px-4 py-3 text-left transition-transform duration-150 ease-out active:scale-[0.98] ${cls}`}
		>
			<span className="text-[26px] font-bold leading-none">{count}</span>
			<span className="text-sm font-medium">{label}</span>
		</button>
	);
}

function EmptyState() {
	return (
		<div className="flex flex-col items-center gap-4 rounded-[16px] border border-dashed border-border bg-card px-6 py-14 text-center">
			<span className="flex size-16 items-center justify-center rounded-full bg-[#f5f5f5]">
				<Warehouse className="size-8 text-[#9e9e9e]" aria-hidden />
			</span>
			<div className="flex flex-col gap-1">
				<h2 className="text-lg font-semibold text-foreground">
					Không tìm thấy mặt hàng
				</h2>
				<p className="text-base text-[#616161]">
					Thử đổi từ khóa hoặc bỏ bớt bộ lọc.
				</p>
			</div>
		</div>
	);
}
