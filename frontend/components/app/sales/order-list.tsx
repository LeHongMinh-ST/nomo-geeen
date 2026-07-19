"use client";

import {
	Eye,
	MoreVertical,
	Package,
	Plus,
	Search,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DataPagination } from "@/components/app/shared/data-pagination";
import { ListFilterBar } from "@/components/app/shared/list-filter-bar";
import { ListSkeleton } from "@/components/app/shared/list-skeleton";
import { LoadMoreSentinel } from "@/components/app/shared/load-more-sentinel";
import { formatDate, formatVND } from "@/lib/format";
import {
	customerLabel,
	type Order,
	type OrderStatus,
	orderItemCount,
	orderStatusBadgeClass,
	orderStatusLabel,
	orderTotal,
	paymentMethodLabel,
	orders as seedOrders,
} from "@/lib/orders";
import { OrderCard } from "./order-card";

/**
 * Danh sách đơn bán hàng — responsive (DESIGN.md §12).
 * Mobile: card list + tải dần khi cuộn. Desktop (lg+): bảng đầy đủ + phân trang.
 * Lọc trạng thái bằng segmented control, tìm theo mã đơn / khách.
 */

type StatusFilter = "all" | OrderStatus;

const statusFilters: { value: StatusFilter; label: string }[] = [
	{ value: "all", label: "Tất cả" },
	{ value: "completed", label: "Hoàn thành" },
	{ value: "draft", label: "Nháp" },
	{ value: "cancelled", label: "Đã hủy" },
];

const PAGE_SIZE = 10;
const MOBILE_BATCH = 8;

export function OrderList() {
	const [items, setItems] = useState<Order[]>(seedOrders);
	const [query, setQuery] = useState("");
	const [status, setStatus] = useState<StatusFilter>("all");
	const [confirmId, setConfirmId] = useState<string | null>(null);
	const [menuId, setMenuId] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [mobileCount, setMobileCount] = useState(MOBILE_BATCH);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const timer = setTimeout(() => setLoading(false), 450);
		return () => clearTimeout(timer);
	}, []);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return items.filter((o) => {
			if (status !== "all" && o.status !== status) return false;
			if (!q) return true;
			return (
				o.code.toLowerCase().includes(q) ||
				customerLabel(o).toLowerCase().includes(q)
			);
		});
	}, [items, query, status]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset khi tiêu chí lọc đổi
	useEffect(() => {
		setPage(1);
		setMobileCount(MOBILE_BATCH);
	}, [query, status]);

	const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const safePage = Math.min(page, pageCount);
	const pageRows = filtered.slice(
		(safePage - 1) * PAGE_SIZE,
		safePage * PAGE_SIZE,
	);

	const mobileRows = filtered.slice(0, mobileCount);
	const mobileHasMore = mobileCount < filtered.length;

	function handleCancel(id: string) {
		// TODO: gọi API hủy đơn (Cancelled + hoàn tồn) khi backend sẵn sàng.
		setItems((current) =>
			current.map((o) =>
				o.id === id ? { ...o, status: "cancelled" as OrderStatus } : o,
			),
		);
		setConfirmId(null);
		setMenuId(null);
	}

	if (loading) return <ListSkeleton withToolbar rows={6} />;

	return (
		<div className="flex w-full flex-col gap-5">
			{/* Page header */}
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-bold tracking-tight text-foreground">
							Đơn bán hàng
						</h1>
						<span className="rounded-full bg-[#e3f2fd] px-2.5 py-0.5 text-sm font-semibold text-[#1565c0]">
							{items.length}
						</span>
					</div>
					<p className="text-base text-[#616161]">
						Đơn có quản lý: công nợ, giao sau, chỉnh trước khi chốt.
					</p>
				</div>

				{/* Hành động — desktop */}
				<div className="hidden items-center gap-2 lg:flex">
					<Link
						href="/ban-nhanh"
						className="flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-4 text-base font-semibold text-foreground transition-colors duration-200 ease-out hover:bg-[#f5f5f5]"
					>
						Bán nhanh
					</Link>
					<Link
						href="/don-ban-hang/tao"
						className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530]"
					>
						<Plus className="size-5" aria-hidden />
						Tạo đơn
					</Link>
				</div>
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
					placeholder="Tìm mã đơn, tên khách..."
					className="h-12 w-full rounded-[10px] border border-border bg-white pl-11 pr-4 text-base text-foreground placeholder:text-[#9e9e9e] transition-colors duration-200 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 md:h-11"
				/>
			</div>

			{/* Lọc trạng thái */}
			<ListFilterBar
				groups={[
					{
						key: "status",
						label: "Trạng thái",
						value: status,
						options: statusFilters,
						onChange: (v) => setStatus(v as StatusFilter),
					},
				]}
			/>

			{/* Kết quả */}
			{filtered.length === 0 ? (
				<EmptyState hasOrders={items.length > 0} />
			) : (
				<>
					{/* Mobile — card list + tải dần */}
					<div className="flex flex-col gap-3 lg:hidden">
						{mobileRows.map((o) => (
							<OrderCard key={o.id} order={o} />
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
								Đã hiển thị tất cả {filtered.length} đơn
							</p>
						)}
					</div>

					{/* Desktop — bảng đầy đủ + phân trang */}
					<div className="hidden flex-col gap-3 lg:flex">
						<div className="overflow-hidden rounded-[16px] border border-border bg-card shadow-card">
							<table className="w-full border-collapse text-left">
								<thead>
									<tr className="bg-[#f5f5f5] text-sm text-[#616161]">
										<th className="min-w-[130px] px-4 py-3 font-semibold">
											Mã đơn
										</th>
										<th className="min-w-[200px] px-4 py-3 font-semibold">
											Khách hàng
										</th>
										<th className="min-w-[110px] whitespace-nowrap px-4 py-3 font-semibold">
											Ngày
										</th>
										<th className="min-w-[130px] whitespace-nowrap px-4 py-3 font-semibold">
											Thanh toán
										</th>
										<th className="min-w-[120px] whitespace-nowrap px-4 py-3 text-right font-semibold">
											Tổng tiền
										</th>
										<th className="min-w-[120px] whitespace-nowrap px-4 py-3 font-semibold">
											Trạng thái
										</th>
										<th className="w-12 px-2 py-3" />
									</tr>
								</thead>
								<tbody>
									{pageRows.map((o) => (
										<tr
											key={o.id}
											className="border-t border-border transition-colors hover:bg-accent"
										>
											<td className="px-4 py-3">
												<Link
													href={`/don-ban-hang/${o.id}`}
													className="flex items-center gap-3"
												>
													<span
														className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
														style={{ backgroundColor: "#5cad45" }}
													>
														<Package
															className="size-4.5 text-white"
															aria-hidden
														/>
													</span>
													<span className="font-semibold text-foreground">
														{o.code}
													</span>
												</Link>
											</td>
											<td className="px-4 py-3">
												<span className="flex flex-col">
													<span className="font-medium text-foreground">
														{customerLabel(o)}
													</span>
													<span className="text-sm text-[#9e9e9e]">
														{orderItemCount(o)} món
													</span>
												</span>
											</td>
											<td className="whitespace-nowrap px-4 py-3 text-base text-[#616161]">
												{formatDate(o.createdAt)}
											</td>
											<td className="whitespace-nowrap px-4 py-3 text-base text-[#616161]">
												{paymentMethodLabel[o.payment]}
											</td>
											<td className="whitespace-nowrap px-4 py-3 text-right text-base font-bold text-foreground">
												{formatVND(orderTotal(o))}₫
											</td>
											<td className="px-4 py-3">
												<span
													className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${orderStatusBadgeClass[o.status]}`}
												>
													{orderStatusLabel[o.status]}
												</span>
											</td>
											<td className="px-2 py-3">
												<RowMenu
													open={menuId === o.id}
													confirming={confirmId === o.id}
													canCancel={o.status !== "cancelled"}
													onToggle={() =>
														setMenuId(menuId === o.id ? null : o.id)
													}
													onClose={() => setMenuId(null)}
													onAskCancel={() => {
														setConfirmId(o.id);
														setMenuId(null);
													}}
													onCancelConfirm={() => setConfirmId(null)}
													onConfirm={() => handleCancel(o.id)}
													viewHref={`/don-ban-hang/${o.id}`}
												/>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>

						<DataPagination
							page={safePage}
							pageCount={pageCount}
							total={filtered.length}
							pageSize={PAGE_SIZE}
							noun="đơn"
							onPage={setPage}
						/>
					</div>
				</>
			)}

			{/* FAB Tạo đơn — mobile/tablet */}
			<Link
				href="/don-ban-hang/tao"
				aria-label="Tạo đơn"
				className="fixed bottom-fab-safe right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-primary pl-4 pr-5 text-base font-semibold text-white shadow-[0_8px_20px_rgba(76,175,80,0.4)] transition-colors duration-200 ease-out active:bg-[#3f8530] lg:hidden"
			>
				<Plus className="size-6" aria-hidden />
				Tạo đơn
			</Link>
		</div>
	);
}

/**
 * Menu ⋮ cho hàng bảng desktop — fixed positioning theo tọa độ nút để thoát
 * container overflow-hidden (DESIGN.md §12.2).
 */
function RowMenu({
	open,
	confirming,
	canCancel,
	onToggle,
	onClose,
	onAskCancel,
	onCancelConfirm,
	onConfirm,
	viewHref,
}: {
	open: boolean;
	confirming: boolean;
	canCancel: boolean;
	onToggle: () => void;
	onClose: () => void;
	onAskCancel: () => void;
	onCancelConfirm: () => void;
	onConfirm: () => void;
	viewHref: string;
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
					onClick={onCancelConfirm}
					className="h-9 rounded-[8px] border border-border px-3 text-sm font-semibold text-[#616161] hover:bg-[#f5f5f5]"
				>
					Không
				</button>
				<button
					type="button"
					onClick={onConfirm}
					className="h-9 rounded-[8px] bg-destructive px-3 text-sm font-semibold text-white hover:bg-[#c62828]"
				>
					Hủy đơn
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
					<button
						type="button"
						aria-label="Đóng menu"
						onClick={onClose}
						className="fixed inset-0 z-40 cursor-default"
					/>
					<div
						className="fixed z-50 w-44 overflow-hidden rounded-[12px] border border-border bg-card shadow-[0_8px_30px_rgba(0,0,0,0.12)]"
						style={{ top: pos.top, right: pos.right }}
					>
						<Link
							href={viewHref}
							className="flex items-center gap-2.5 px-4 py-2.5 text-base text-foreground hover:bg-[#f5f5f5]"
						>
							<Eye className="size-4.5 text-[#616161]" aria-hidden />
							Xem chi tiết
						</Link>
						{canCancel ? (
							<button
								type="button"
								onClick={onAskCancel}
								className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-base text-destructive hover:bg-[#fdecea]"
							>
								<XCircle className="size-4.5" aria-hidden />
								Hủy đơn
							</button>
						) : null}
					</div>
				</>
			) : null}
		</div>
	);
}

function EmptyState({ hasOrders }: { hasOrders: boolean }) {
	return (
		<div className="flex flex-col items-center gap-4 rounded-[16px] border border-dashed border-border bg-card px-6 py-14 text-center">
			<span className="flex size-16 items-center justify-center rounded-full bg-[#f5f5f5]">
				<Package className="size-8 text-[#9e9e9e]" aria-hidden />
			</span>
			<div className="flex flex-col gap-1">
				<h2 className="text-lg font-semibold text-foreground">
					{hasOrders ? "Không tìm thấy đơn nào" : "Chưa có đơn bán nào"}
				</h2>
				<p className="text-base text-[#616161]">
					{hasOrders
						? "Thử đổi từ khóa hoặc bỏ bớt bộ lọc."
						: "Bắt đầu bán hàng để ghi nhận doanh thu."}
				</p>
			</div>
			{!hasOrders ? (
				<Link
					href="/don-ban-hang/tao"
					className="flex h-12 items-center gap-2 rounded-[10px] bg-primary px-6 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530]"
				>
					<Plus className="size-5" aria-hidden />
					Tạo đơn
				</Link>
			) : null}
		</div>
	);
}
