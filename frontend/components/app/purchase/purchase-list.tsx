"use client";

import {
	Eye,
	MoreVertical,
	PackagePlus,
	Plus,
	Search,
	XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PurchaseCard } from "@/components/app/purchase/purchase-card";
import { DataPagination } from "@/components/app/shared/data-pagination";
import { LoadMoreSentinel } from "@/components/app/shared/load-more-sentinel";
import { formatDate, formatVND } from "@/lib/format";
import {
	type Purchase,
	type PurchaseStatus,
	purchaseItemCount,
	purchasePaymentLabel,
	purchaseStatusBadgeClass,
	purchaseStatusLabel,
	purchaseTotal,
	purchases as seedPurchases,
	supplierLabel,
} from "@/lib/purchases";

/**
 * Danh sách phiếu nhập — responsive (DESIGN.md §12).
 * Mobile: card list + tải dần khi cuộn. Desktop (lg+): bảng + phân trang.
 * Lọc trạng thái segmented, tìm theo mã phiếu / NCC.
 */

type StatusFilter = "all" | PurchaseStatus;

const statusFilters: { value: StatusFilter; label: string }[] = [
	{ value: "all", label: "Tất cả" },
	{ value: "completed", label: "Hoàn thành" },
	{ value: "draft", label: "Nháp" },
	{ value: "cancelled", label: "Đã hủy" },
];

const PAGE_SIZE = 10;
const MOBILE_BATCH = 8;

export function PurchaseList() {
	const [items, setItems] = useState<Purchase[]>(seedPurchases);
	const [query, setQuery] = useState("");
	const [status, setStatus] = useState<StatusFilter>("all");
	const [confirmId, setConfirmId] = useState<string | null>(null);
	const [menuId, setMenuId] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [mobileCount, setMobileCount] = useState(MOBILE_BATCH);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return items.filter((p) => {
			if (status !== "all" && p.status !== status) return false;
			if (!q) return true;
			return (
				p.code.toLowerCase().includes(q) ||
				supplierLabel(p).toLowerCase().includes(q)
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
		// TODO: gọi API hủy phiếu (Cancelled + hoàn tồn nếu đã cộng) khi backend sẵn sàng.
		setItems((current) =>
			current.map((p) =>
				p.id === id ? { ...p, status: "cancelled" as PurchaseStatus } : p,
			),
		);
		setConfirmId(null);
		setMenuId(null);
	}

	return (
		<div className="flex w-full flex-col gap-5">
			{/* Page header */}
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-bold tracking-tight text-foreground">
							Nhập hàng
						</h1>
						<span className="rounded-full bg-[#e3f2fd] px-2.5 py-0.5 text-sm font-semibold text-[#1565c0]">
							{items.length}
						</span>
					</div>
					<p className="text-base text-[#616161]">
						Phiếu nhập từ nhà cung cấp — hoàn thành là cộng tồn ngay.
					</p>
				</div>

				<div className="hidden items-center gap-2 lg:flex">
					<Link
						href="/nhap-hang/tao"
						className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#43a047] active:bg-[#2e7d32]"
					>
						<Plus className="size-5" aria-hidden />
						Tạo phiếu nhập
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
					placeholder="Tìm mã phiếu, tên NCC..."
					className="h-12 w-full rounded-[10px] border border-border bg-white pl-11 pr-4 text-base text-foreground placeholder:text-[#9e9e9e] transition-colors duration-200 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 md:h-11"
				/>
			</div>

			{/* Lọc trạng thái — segmented control chia đều */}
			<div className="grid grid-cols-4 gap-1 rounded-[12px] bg-[#f0f2f1] p-1">
				{statusFilters.map((f) => (
					<button
						key={f.value}
						type="button"
						onClick={() => setStatus(f.value)}
						className={`h-9 rounded-[9px] text-sm font-semibold transition-colors duration-200 ease-out ${
							status === f.value
								? "bg-card text-primary shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
								: "text-[#616161] hover:text-foreground"
						}`}
					>
						{f.label}
					</button>
				))}
			</div>

			{filtered.length === 0 ? (
				<EmptyState hasItems={items.length > 0} />
			) : (
				<>
					{/* Mobile — card list + tải dần */}
					<div className="flex flex-col gap-3 lg:hidden">
						{mobileRows.map((p) => (
							<PurchaseCard key={p.id} purchase={p} />
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
								Đã hiển thị tất cả {filtered.length} phiếu
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
											Mã phiếu
										</th>
										<th className="min-w-[200px] px-4 py-3 font-semibold">
											Nhà cung cấp
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
									{pageRows.map((p) => (
										<tr
											key={p.id}
											className="border-t border-border transition-colors hover:bg-accent"
										>
											<td className="px-4 py-3">
												<Link
													href={`/nhap-hang/${p.id}`}
													className="flex items-center gap-3"
												>
													<span
														className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
														style={{ backgroundColor: "#26a69a" }}
													>
														<PackagePlus
															className="size-4.5 text-white"
															aria-hidden
														/>
													</span>
													<span className="font-semibold text-foreground">
														{p.code}
													</span>
												</Link>
											</td>
											<td className="px-4 py-3">
												<span className="flex flex-col">
													<span className="font-medium text-foreground">
														{supplierLabel(p)}
													</span>
													<span className="text-sm text-[#9e9e9e]">
														{purchaseItemCount(p)} mặt hàng
													</span>
												</span>
											</td>
											<td className="whitespace-nowrap px-4 py-3 text-base text-[#616161]">
												{formatDate(p.createdAt)}
											</td>
											<td className="whitespace-nowrap px-4 py-3 text-base text-[#616161]">
												{purchasePaymentLabel[p.payment]}
											</td>
											<td className="whitespace-nowrap px-4 py-3 text-right text-base font-bold text-foreground">
												{formatVND(purchaseTotal(p))}₫
											</td>
											<td className="px-4 py-3">
												<span
													className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${purchaseStatusBadgeClass[p.status]}`}
												>
													{purchaseStatusLabel[p.status]}
												</span>
											</td>
											<td className="px-2 py-3">
												<RowMenu
													open={menuId === p.id}
													confirming={confirmId === p.id}
													canCancel={p.status !== "cancelled"}
													onToggle={() =>
														setMenuId(menuId === p.id ? null : p.id)
													}
													onClose={() => setMenuId(null)}
													onAskCancel={() => {
														setConfirmId(p.id);
														setMenuId(null);
													}}
													onCancelConfirm={() => setConfirmId(null)}
													onConfirm={() => handleCancel(p.id)}
													viewHref={`/nhap-hang/${p.id}`}
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
							noun="phiếu"
							onPage={setPage}
						/>
					</div>
				</>
			)}

			{/* FAB Tạo phiếu nhập — mobile/tablet */}
			<Link
				href="/nhap-hang/tao"
				aria-label="Tạo phiếu nhập"
				className="fixed bottom-fab-safe right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-primary pl-4 pr-5 text-base font-semibold text-white shadow-[0_8px_20px_rgba(76,175,80,0.4)] transition-colors duration-200 ease-out active:bg-[#2e7d32] lg:hidden"
			>
				<Plus className="size-6" aria-hidden />
				Tạo phiếu
			</Link>
		</div>
	);
}

/**
 * Menu ⋮ cho hàng bảng desktop — fixed positioning theo tọa độ nút (§12.2).
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
					Hủy phiếu
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
								Hủy phiếu
							</button>
						) : null}
					</div>
				</>
			) : null}
		</div>
	);
}

function EmptyState({ hasItems }: { hasItems: boolean }) {
	return (
		<div className="flex flex-col items-center gap-4 rounded-[16px] border border-dashed border-border bg-card px-6 py-14 text-center">
			<span className="flex size-16 items-center justify-center rounded-full bg-[#f5f5f5]">
				<PackagePlus className="size-8 text-[#9e9e9e]" aria-hidden />
			</span>
			<div className="flex flex-col gap-1">
				<h2 className="text-lg font-semibold text-foreground">
					{hasItems ? "Không tìm thấy phiếu nào" : "Chưa có phiếu nhập nào"}
				</h2>
				<p className="text-base text-[#616161]">
					{hasItems
						? "Thử đổi từ khóa hoặc bỏ bớt bộ lọc."
						: "Tạo phiếu nhập để cộng hàng vào kho."}
				</p>
			</div>
			{!hasItems ? (
				<Link
					href="/nhap-hang/tao"
					className="flex h-12 items-center gap-2 rounded-[10px] bg-primary px-6 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#43a047] active:bg-[#2e7d32]"
				>
					<Plus className="size-5" aria-hidden />
					Tạo phiếu nhập
				</Link>
			) : null}
		</div>
	);
}
