"use client";

import {
	ChevronLeft,
	ChevronRight,
	FolderCog,
	MoreVertical,
	Package,
	Pencil,
	Plus,
	Search,
	Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ListFilterBar } from "@/components/app/shared/list-filter-bar";
import { ListSkeleton } from "@/components/app/shared/list-skeleton";
import { formatVND } from "@/lib/format";
import {
	brandName,
	categoryName,
	getStockStatus,
	type Product,
	type StockStatus,
	stockStatusBadgeClass,
	stockStatusLabel,
} from "@/lib/products";
import {
	deleteTenantProduct,
	getProductLookups,
	listTenantProducts,
	mapTenantProduct,
	type ProductLookups,
} from "@/lib/tenant-products-api";
import { ProductCard } from "./product-card";

/**
 * Danh sách sản phẩm — responsive (DESIGN.md §12).
 * Mobile: card list + tải dần khi cuộn (infinite scroll), không phân trang.
 * Desktop (lg+): bảng đầy đủ + phân trang.
 * Lọc: segmented control (trạng thái) + pill cuộn (danh mục), không modal.
 */

type StatusFilter = "all" | StockStatus;

const statusFilters: { value: StatusFilter; label: string }[] = [
	{ value: "all", label: "Tất cả" },
	{ value: "in-stock", label: "Còn hàng" },
	{ value: "low-stock", label: "Sắp hết" },
	{ value: "out-of-stock", label: "Hết hàng" },
];

/** Số dòng mỗi trang bảng desktop. */
const PAGE_SIZE = 10;
/** Số thẻ tải thêm mỗi lần cuộn tới đáy trên mobile. */
const MOBILE_BATCH = 8;

export function ProductList() {
	const [items, setItems] = useState<Product[]>([]);
	const [lookups, setLookups] = useState<ProductLookups | null>(null);
	const [query, setQuery] = useState("");
	const [categoryId, setCategoryId] = useState<string>("all");
	const [status, setStatus] = useState<StatusFilter>("all");
	const [confirmId, setConfirmId] = useState<string | null>(null);
	const [menuId, setMenuId] = useState<string | null>(null);
	// Desktop: trang hiện tại. Mobile: số thẻ đang hiển thị.
	const [page, setPage] = useState(1);
	const [mobileCount, setMobileCount] = useState(MOBILE_BATCH);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const [rows, catalog] = await Promise.all([
				listTenantProducts(),
				getProductLookups(),
			]);
			setLookups(catalog);
			setItems(rows.map((row) => mapTenantProduct(row, catalog)));
		} catch {
			setError("Không thể tải danh sách sản phẩm. Vui lòng thử lại.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		void load();
	}, [load]);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return items.filter((p) => {
			if (categoryId !== "all" && p.categoryId !== categoryId) return false;
			if (status !== "all" && getStockStatus(p) !== status) return false;
			if (!q) return true;
			return (
				p.name.toLowerCase().includes(q) ||
				p.sku.toLowerCase().includes(q) ||
				(p.barcode?.includes(q) ?? false)
			);
		});
	}, [items, query, categoryId, status]);

	// Đổi bộ lọc/tìm kiếm → về trang đầu và thu gọn lại danh sách mobile.
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset khi tiêu chí lọc đổi
	useEffect(() => {
		setPage(1);
		setMobileCount(MOBILE_BATCH);
	}, [query, categoryId, status]);

	const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const safePage = Math.min(page, pageCount);
	const pageRows = filtered.slice(
		(safePage - 1) * PAGE_SIZE,
		safePage * PAGE_SIZE,
	);

	const mobileRows = filtered.slice(0, mobileCount);
	const mobileHasMore = mobileCount < filtered.length;

	async function handleDelete(id: string) {
		try {
			await deleteTenantProduct(id);
			setItems((current) => current.filter((p) => p.id !== id));
			setConfirmId(null);
			setMenuId(null);
		} catch {
			setError("Không thể xóa sản phẩm. Vui lòng thử lại.");
		}
	}

	if (loading) return <ListSkeleton withToolbar rows={6} />;
	if (error && !lookups) {
		return (
			<div className="rounded-[16px] border border-dashed border-border bg-card p-8 text-center">
				<p className="text-base text-destructive">{error}</p>
				<button
					type="button"
					onClick={() => void load()}
					className="mt-4 h-11 rounded-[10px] bg-primary px-5 text-base font-semibold text-white"
				>
					Thử lại
				</button>
			</div>
		);
	}

	return (
		<div className="flex w-full flex-col gap-5">
			{error ? (
				<div
					className="rounded-[10px] bg-[#fff5f5] px-3 py-2 text-sm text-destructive"
					role="alert"
				>
					{error}
				</div>
			) : null}
			{/* Page header */}
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-bold tracking-tight text-foreground">
							Sản phẩm
						</h1>
						<span className="rounded-full bg-[#e3f2fd] px-2.5 py-0.5 text-sm font-semibold text-[#1565c0]">
							{items.length}
						</span>
					</div>
					<p className="text-base text-[#616161]">
						Quản lý hàng hóa, giá bán và tồn kho.
					</p>
				</div>

				{/* Hành động — desktop */}
				<div className="hidden items-center gap-2 lg:flex">
					<Link
						href="/san-pham/danh-muc"
						className="flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-4 text-base font-semibold text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
					>
						<FolderCog className="size-5" aria-hidden />
						Danh mục
					</Link>
					<Link
						href="/san-pham/them"
						className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530]"
					>
						<Plus className="size-5" aria-hidden />
						Thêm sản phẩm
					</Link>
				</div>
			</div>

			{/* Thanh tìm kiếm + link danh mục (mobile) */}
			<div className="flex items-center gap-2">
				<div className="relative flex-1">
					<Search
						className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-[#9e9e9e]"
						aria-hidden
					/>
					<input
						type="search"
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						placeholder="Tìm tên, mã SKU, mã vạch..."
						className="h-12 w-full rounded-[10px] border border-border bg-white pl-11 pr-4 text-base text-foreground placeholder:text-[#9e9e9e] transition-colors duration-200 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 md:h-11"
					/>
				</div>
				<Link
					href="/san-pham/danh-muc"
					aria-label="Quản lý danh mục"
					className="flex size-12 shrink-0 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5] md:h-11 lg:hidden"
				>
					<FolderCog className="size-5" aria-hidden />
				</Link>
			</div>

			{/* Bộ lọc — không modal */}
			<ListFilterBar
				groups={[
					{
						key: "status",
						label: "Trạng thái tồn",
						value: status,
						options: statusFilters,
						onChange: (v) => setStatus(v as StatusFilter),
					},
					{
						key: "category",
						label: "Danh mục",
						value: categoryId,
						options: [
							{ value: "all", label: "Mọi danh mục" },
							...(lookups?.categories ?? []).map((c) => ({
								value: c.id,
								label: c.name,
							})),
						],
						onChange: setCategoryId,
					},
				]}
			/>

			{/* Kết quả */}
			{filtered.length === 0 ? (
				<EmptyState hasProducts={items.length > 0} />
			) : (
				<>
					{/* Mobile — card list + tải dần khi cuộn */}
					<div className="flex flex-col gap-3 lg:hidden">
						{mobileRows.map((p) => (
							<ProductCard key={p.id} product={p} />
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
								Đã hiển thị tất cả {filtered.length} sản phẩm
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
										<th className="min-w-[120px] px-4 py-3 font-semibold">
											Danh mục
										</th>
										<th className="min-w-[110px] whitespace-nowrap px-4 py-3 text-right font-semibold">
											Giá bán
										</th>
										<th className="min-w-[100px] whitespace-nowrap px-4 py-3 text-right font-semibold">
											Tồn kho
										</th>
										<th className="min-w-[110px] whitespace-nowrap px-4 py-3 font-semibold">
											Trạng thái
										</th>
										<th className="w-12 px-2 py-3" />
									</tr>
								</thead>
								<tbody>
									{pageRows.map((p) => {
										const st = getStockStatus(p);
										return (
											<tr
												key={p.id}
												className="border-t border-border transition-colors hover:bg-accent"
											>
												<td className="px-4 py-3">
													<Link
														href={`/san-pham/${p.id}`}
														className="flex items-center gap-3"
													>
														<span
															className="flex size-10 shrink-0 items-center justify-center rounded-[10px]"
															style={{ backgroundColor: "#5cad45" }}
														>
															<Package
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
																{p.brandId
																	? ` · ${p.brandLabel ?? brandName(p.brandId)}`
																	: ""}
															</span>
														</span>
													</Link>
												</td>
												<td className="px-4 py-3 text-base text-[#616161]">
													{p.categoryLabel ?? categoryName(p.categoryId)}
												</td>
												<td className="whitespace-nowrap px-4 py-3 text-right text-base font-bold text-foreground">
													{formatVND(p.salePrice)}₫
												</td>
												<td className="whitespace-nowrap px-4 py-3 text-right text-base text-foreground">
													{formatVND(p.stock)}{" "}
													<span className="text-sm text-[#9e9e9e]">
														{p.baseUnit}
													</span>
												</td>
												<td className="px-4 py-3">
													<span
														className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${stockStatusBadgeClass[st]}`}
													>
														{stockStatusLabel[st]}
													</span>
												</td>
												<td className="px-2 py-3">
													<RowMenu
														open={menuId === p.id}
														confirming={confirmId === p.id}
														onToggle={() =>
															setMenuId(menuId === p.id ? null : p.id)
														}
														onClose={() => setMenuId(null)}
														onAskDelete={() => {
															setConfirmId(p.id);
															setMenuId(null);
														}}
														onCancel={() => setConfirmId(null)}
														onConfirm={() => handleDelete(p.id)}
														editHref={`/san-pham/${p.id}`}
													/>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>
						</div>

						<Pagination
							page={safePage}
							pageCount={pageCount}
							total={filtered.length}
							pageSize={PAGE_SIZE}
							onPage={setPage}
						/>
					</div>
				</>
			)}

			{/* FAB Thêm sản phẩm — mobile/tablet (desktop đã có nút ở header) */}
			<Link
				href="/san-pham/them"
				aria-label="Thêm sản phẩm"
				className="fixed bottom-fab-safe right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-primary pl-4 pr-5 text-base font-semibold text-white shadow-[0_8px_20px_rgba(76,175,80,0.4)] transition-colors duration-200 ease-out active:bg-[#3f8530] lg:hidden"
			>
				<Plus className="size-6" aria-hidden />
				Thêm
			</Link>
		</div>
	);
}

/** Sentinel quan sát bằng IntersectionObserver để tải thêm khi cuộn tới. */
function LoadMoreSentinel({ onReach }: { onReach: () => void }) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) onReach();
			},
			{ rootMargin: "200px" },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [onReach]);

	return (
		<div ref={ref} className="flex justify-center py-3">
			<span className="size-6 animate-spin rounded-full border-2 border-[#e0e0e0] border-t-primary" />
		</div>
	);
}

/** Phân trang bảng desktop. */
function Pagination({
	page,
	pageCount,
	total,
	pageSize,
	onPage,
}: {
	page: number;
	pageCount: number;
	total: number;
	pageSize: number;
	onPage: (p: number) => void;
}) {
	if (pageCount <= 1) {
		return <p className="px-1 text-sm text-[#616161]">Tổng {total} sản phẩm</p>;
	}

	const from = (page - 1) * pageSize + 1;
	const to = Math.min(page * pageSize, total);

	return (
		<div className="flex items-center justify-between px-1">
			<p className="text-sm text-[#616161]">
				Hiển thị {from}–{to} trên {total} sản phẩm
			</p>
			<div className="flex items-center gap-1">
				<button
					type="button"
					aria-label="Trang trước"
					onClick={() => onPage(page - 1)}
					disabled={page <= 1}
					className="flex size-9 items-center justify-center rounded-[8px] border border-border bg-card text-[#616161] transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-40"
				>
					<ChevronLeft className="size-5" aria-hidden />
				</button>
				{Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
					<button
						key={p}
						type="button"
						onClick={() => onPage(p)}
						className={`h-9 min-w-9 rounded-[8px] px-2 text-sm font-semibold transition-colors ${
							p === page
								? "bg-primary text-white"
								: "border border-border bg-card text-[#616161] hover:bg-[#f5f5f5]"
						}`}
					>
						{p}
					</button>
				))}
				<button
					type="button"
					aria-label="Trang sau"
					onClick={() => onPage(page + 1)}
					disabled={page >= pageCount}
					className="flex size-9 items-center justify-center rounded-[8px] border border-border bg-card text-[#616161] transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-40"
				>
					<ChevronRight className="size-5" aria-hidden />
				</button>
			</div>
		</div>
	);
}

/**
 * Menu ⋮ cho hàng bảng desktop. Dùng fixed positioning theo tọa độ nút để
 * thoát khỏi container overflow-hidden của bảng (không bị cắt).
 */
function RowMenu({
	open,
	confirming,
	onToggle,
	onClose,
	onAskDelete,
	onCancel,
	onConfirm,
	editHref,
}: {
	open: boolean;
	confirming: boolean;
	onToggle: () => void;
	onClose: () => void;
	onAskDelete: () => void;
	onCancel: () => void;
	onConfirm: () => void;
	editHref: string;
}) {
	const btnRef = useRef<HTMLButtonElement>(null);
	const [pos, setPos] = useState<{ top: number; right: number } | null>(null);

	useEffect(() => {
		if (!open) {
			setPos(null);
			return;
		}
		function place() {
			const el = btnRef.current;
			if (!el) return;
			const r = el.getBoundingClientRect();
			setPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
		}
		place();
		window.addEventListener("scroll", onClose, true);
		window.addEventListener("resize", onClose);
		return () => {
			window.removeEventListener("scroll", onClose, true);
			window.removeEventListener("resize", onClose);
		};
	}, [open, onClose]);

	if (confirming) {
		return (
			<div className="flex items-center justify-end gap-1.5">
				<button
					type="button"
					onClick={onCancel}
					className="h-9 rounded-[8px] border border-border px-3 text-sm font-semibold text-[#616161] hover:bg-[#f5f5f5]"
				>
					Hủy
				</button>
				<button
					type="button"
					onClick={onConfirm}
					className="h-9 rounded-[8px] bg-destructive px-3 text-sm font-semibold text-white hover:bg-[#c62828]"
				>
					Xóa
				</button>
			</div>
		);
	}

	return (
		<div className="flex justify-end">
			<button
				ref={btnRef}
				type="button"
				aria-label="Thao tác"
				onClick={onToggle}
				className="flex size-9 items-center justify-center rounded-[8px] text-[#616161] hover:bg-[#f5f5f5]"
			>
				<MoreVertical className="size-5" aria-hidden />
			</button>
			{open && pos ? (
				<>
					{/* Lớp bắt click ra ngoài để đóng */}
					<button
						type="button"
						aria-label="Đóng menu"
						onClick={onClose}
						className="fixed inset-0 z-40 cursor-default"
					/>
					<div
						className="fixed z-50 w-40 overflow-hidden rounded-[12px] border border-border bg-card shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
						style={{ top: pos.top, right: pos.right }}
					>
						<Link
							href={editHref}
							className="flex items-center gap-2.5 px-4 py-2.5 text-base text-foreground hover:bg-[#f5f5f5]"
						>
							<Pencil className="size-4.5 text-[#616161]" aria-hidden />
							Xem / Sửa
						</Link>
						<button
							type="button"
							onClick={onAskDelete}
							className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-base text-destructive hover:bg-[#fdecea]"
						>
							<Trash2 className="size-4.5" aria-hidden />
							Xóa
						</button>
					</div>
				</>
			) : null}
		</div>
	);
}

function EmptyState({ hasProducts }: { hasProducts: boolean }) {
	return (
		<div className="flex flex-col items-center gap-4 rounded-[16px] border border-dashed border-border bg-card px-6 py-14 text-center">
			<span className="flex size-16 items-center justify-center rounded-full bg-[#f5f5f5]">
				<Package className="size-8 text-[#9e9e9e]" aria-hidden />
			</span>
			<div className="flex flex-col gap-1">
				<h2 className="text-lg font-semibold text-foreground">
					{hasProducts ? "Không tìm thấy sản phẩm" : "Chưa có sản phẩm nào"}
				</h2>
				<p className="text-base text-[#616161]">
					{hasProducts
						? "Thử đổi từ khóa hoặc bỏ bớt bộ lọc."
						: "Thêm sản phẩm để bắt đầu quản lý hàng hóa."}
				</p>
			</div>
			{!hasProducts ? (
				<Link
					href="/san-pham/them"
					className="flex h-12 items-center gap-2 rounded-[10px] bg-primary px-6 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530]"
				>
					<Plus className="size-5" aria-hidden />
					Thêm sản phẩm
				</Link>
			) : null}
		</div>
	);
}
