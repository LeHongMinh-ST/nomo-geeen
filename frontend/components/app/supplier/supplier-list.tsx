"use client";

import {
	Eye,
	MoreVertical,
	Pencil,
	Plus,
	Search,
	Trash2,
	Truck,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DataPagination } from "@/components/app/shared/data-pagination";
import { ListFilterBar } from "@/components/app/shared/list-filter-bar";
import { ListSkeleton } from "@/components/app/shared/list-skeleton";
import { LoadMoreSentinel } from "@/components/app/shared/load-more-sentinel";
import { SupplierCard } from "@/components/app/supplier/supplier-card";
import { debtOutstanding, getDebt } from "@/lib/debts";
import { formatVND } from "@/lib/format";
import {
	type Supplier,
	type SupplierType,
	suppliers as seedSuppliers,
	supplierTypeLabel,
} from "@/lib/suppliers";

/**
 * Danh sách nhà cung cấp — responsive (DESIGN.md §12).
 * Mobile: card list + tải dần khi cuộn. Desktop (lg+): bảng + phân trang.
 * Lọc theo loại NCC; tìm theo tên / mã / SĐT. Cột "Phải trả" nối từ payables.
 */

type TypeFilter = "all" | SupplierType;

const typeFilters: { value: TypeFilter; label: string }[] = [
	{ value: "all", label: "Tất cả loại" },
	{ value: "manufacturer", label: supplierTypeLabel.manufacturer },
	{ value: "distributor", label: supplierTypeLabel.distributor },
	{ value: "agent", label: supplierTypeLabel.agent },
];

const PAGE_SIZE = 10;
const MOBILE_BATCH = 8;

/** Số tiền cửa hàng đang nợ NCC (payables dùng chung id với supplier). */
function payableOf(id: string): number {
	const account = getDebt(id);
	return account ? debtOutstanding(account) : 0;
}

export function SupplierList() {
	const [items, setItems] = useState<Supplier[]>(seedSuppliers);
	const [query, setQuery] = useState("");
	const [type, setType] = useState<TypeFilter>("all");
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
		return items.filter((s) => {
			if (type !== "all" && s.type !== type) return false;
			if (!q) return true;
			return (
				s.name.toLowerCase().includes(q) ||
				s.code.toLowerCase().includes(q) ||
				s.phone.toLowerCase().includes(q)
			);
		});
	}, [items, query, type]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset khi tiêu chí lọc đổi
	useEffect(() => {
		setPage(1);
		setMobileCount(MOBILE_BATCH);
	}, [query, type]);

	const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const safePage = Math.min(page, pageCount);
	const pageRows = filtered.slice(
		(safePage - 1) * PAGE_SIZE,
		safePage * PAGE_SIZE,
	);

	const mobileRows = filtered.slice(0, mobileCount);
	const mobileHasMore = mobileCount < filtered.length;

	function handleDelete(id: string) {
		// TODO: gọi API xóa nhà cung cấp khi backend sẵn sàng.
		setItems((current) => current.filter((s) => s.id !== id));
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
							Nhà cung cấp
						</h1>
						<span className="rounded-full bg-[#e3f2fd] px-2.5 py-0.5 text-sm font-semibold text-[#1565c0]">
							{items.length}
						</span>
					</div>
					<p className="text-base text-[#616161]">
						Đối tác nhập hàng — theo dõi liên hệ và công nợ phải trả.
					</p>
				</div>

				<div className="hidden items-center gap-2 lg:flex">
					<Link
						href="/nha-cung-cap/them"
						className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530]"
					>
						<Plus className="size-5" aria-hidden />
						Thêm nhà cung cấp
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
					placeholder="Tìm tên NCC, mã, số điện thoại..."
					className="h-12 w-full rounded-[10px] border border-border bg-white pl-11 pr-4 text-base text-foreground placeholder:text-[#9e9e9e] transition-colors duration-200 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 md:h-11"
				/>
			</div>

			{/* Lọc loại NCC */}
			<ListFilterBar
				groups={[
					{
						key: "type",
						label: "Loại NCC",
						value: type,
						options: typeFilters,
						onChange: (v) => setType(v as TypeFilter),
					},
				]}
			/>

			{filtered.length === 0 ? (
				<EmptyState hasItems={items.length > 0} />
			) : (
				<>
					{/* Mobile — card list + tải dần */}
					<div className="flex flex-col gap-3 lg:hidden">
						{mobileRows.map((s) => (
							<SupplierCard key={s.id} supplier={s} payable={payableOf(s.id)} />
						))}
						{mobileHasMore ? (
							<LoadMoreSentinel
								onReach={() =>
									setMobileCount((n) =>
										Math.min(n + MOBILE_BATCH, filtered.length),
									)
								}
							/>
						) : (
							<p className="py-2 text-center text-sm text-[#9e9e9e]">
								Đã hiển thị tất cả {filtered.length} nhà cung cấp
							</p>
						)}
					</div>

					{/* Desktop — bảng đầy đủ + phân trang */}
					<div className="hidden flex-col gap-3 lg:flex">
						<div className="overflow-hidden rounded-[16px] border border-border bg-card shadow-card">
							<table className="w-full border-collapse text-left">
								<thead>
									<tr className="bg-[#f5f5f5] text-sm text-[#616161]">
										<th className="min-w-[130px] whitespace-nowrap px-4 py-3 font-semibold">
											Mã NCC
										</th>
										<th className="min-w-[220px] px-4 py-3 font-semibold">
											Nhà cung cấp
										</th>
										<th className="min-w-[140px] whitespace-nowrap px-4 py-3 font-semibold">
											Loại
										</th>
										<th className="min-w-[140px] whitespace-nowrap px-4 py-3 font-semibold">
											Số điện thoại
										</th>
										<th className="min-w-[130px] whitespace-nowrap px-4 py-3 text-right font-semibold">
											Phải trả
										</th>
										<th className="w-12 px-2 py-3" />
									</tr>
								</thead>
								<tbody>
									{pageRows.map((s) => {
										const payable = payableOf(s.id);
										return (
											<tr
												key={s.id}
												className="border-t border-border transition-colors hover:bg-accent"
											>
												<td className="whitespace-nowrap px-4 py-3">
													<Link
														href={`/nha-cung-cap/${s.id}`}
														className="flex items-center gap-3"
													>
														<span
															className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
															style={{ backgroundColor: "#1a6fa8" }}
														>
															<Truck
																className="size-4.5 text-white"
																aria-hidden
															/>
														</span>
														<span className="font-semibold text-foreground">
															{s.code}
														</span>
													</Link>
												</td>
												<td className="px-4 py-3">
													<span className="flex min-w-0 flex-col">
														<span className="font-medium text-foreground">
															{s.name}
														</span>
														{s.address ? (
															<span className="truncate text-sm text-[#9e9e9e]">
																{s.address}
															</span>
														) : null}
													</span>
												</td>
												<td className="whitespace-nowrap px-4 py-3 text-base text-[#616161]">
													{supplierTypeLabel[s.type]}
												</td>
												<td className="whitespace-nowrap px-4 py-3 text-base text-[#616161]">
													{s.phone}
												</td>
												<td className="whitespace-nowrap px-4 py-3 text-right text-base font-bold">
													{payable > 0 ? (
														<span className="text-[#f57f17]">
															{formatVND(payable)}₫
														</span>
													) : (
														<span className="text-[#9e9e9e]">—</span>
													)}
												</td>
												<td className="px-2 py-3">
													<RowMenu
														open={menuId === s.id}
														confirming={confirmId === s.id}
														onToggle={() =>
															setMenuId(menuId === s.id ? null : s.id)
														}
														onClose={() => setMenuId(null)}
														onAskDelete={() => {
															setConfirmId(s.id);
															setMenuId(null);
														}}
														onCancelDelete={() => setConfirmId(null)}
														onConfirm={() => handleDelete(s.id)}
														viewHref={`/nha-cung-cap/${s.id}`}
														editHref={`/nha-cung-cap/${s.id}/sua`}
													/>
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
							noun="nhà cung cấp"
							onPage={setPage}
						/>
					</div>
				</>
			)}

			{/* FAB Thêm NCC — mobile/tablet */}
			<Link
				href="/nha-cung-cap/them"
				aria-label="Thêm nhà cung cấp"
				className="fixed bottom-fab-safe right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-primary pl-4 pr-5 text-base font-semibold text-white shadow-[0_8px_20px_rgba(76,175,80,0.4)] transition-colors duration-200 ease-out active:bg-[#3f8530] lg:hidden"
			>
				<Plus className="size-6" aria-hidden />
				Thêm NCC
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
	onToggle,
	onClose,
	onAskDelete,
	onCancelDelete,
	onConfirm,
	viewHref,
	editHref,
}: {
	open: boolean;
	confirming: boolean;
	onToggle: () => void;
	onClose: () => void;
	onAskDelete: () => void;
	onCancelDelete: () => void;
	onConfirm: () => void;
	viewHref: string;
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
					onClick={onCancelDelete}
					className="h-9 rounded-[8px] border border-border px-3 text-sm font-semibold text-[#616161] hover:bg-[#f5f5f5]"
				>
					Không
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
						<Link
							href={editHref}
							className="flex items-center gap-2.5 px-4 py-2.5 text-base text-foreground hover:bg-[#f5f5f5]"
						>
							<Pencil className="size-4.5 text-[#616161]" aria-hidden />
							Sửa
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

function EmptyState({ hasItems }: { hasItems: boolean }) {
	return (
		<div className="flex flex-col items-center gap-4 rounded-[16px] border border-dashed border-border bg-card px-6 py-14 text-center">
			<span className="flex size-16 items-center justify-center rounded-full bg-[#f5f5f5]">
				<Truck className="size-8 text-[#9e9e9e]" aria-hidden />
			</span>
			<div className="flex flex-col gap-1">
				<h2 className="text-lg font-semibold text-foreground">
					{hasItems ? "Không tìm thấy NCC nào" : "Chưa có nhà cung cấp nào"}
				</h2>
				<p className="text-base text-[#616161]">
					{hasItems
						? "Thử đổi từ khóa hoặc bỏ bớt bộ lọc."
						: "Thêm nhà cung cấp để ghi phiếu nhập và theo dõi công nợ."}
				</p>
			</div>
			{!hasItems ? (
				<Link
					href="/nha-cung-cap/them"
					className="flex h-12 items-center gap-2 rounded-[10px] bg-primary px-6 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530]"
				>
					<Plus className="size-5" aria-hidden />
					Thêm nhà cung cấp
				</Link>
			) : null}
		</div>
	);
}
