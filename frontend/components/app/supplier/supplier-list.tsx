"use client";

import { Pencil, Plus, Search, Trash2, Truck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DataPagination } from "@/components/app/shared/data-pagination";
import { ListSkeleton } from "@/components/app/shared/list-skeleton";
import { SupplierCard } from "@/components/app/supplier/supplier-card";
import {
	deleteTenantSupplier,
	listTenantSuppliers,
	supplierTypeLabel,
	type TenantSupplier,
} from "@/lib/tenant-suppliers-api";
import { formatVND } from "@/lib/format";

const PAGE_SIZE = 20;

export function SupplierList() {
	const [items, setItems] = useState<TenantSupplier[]>([]);
	const [query, setQuery] = useState("");
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [deleting, setDeleting] = useState<string | null>(null);
	const requestId = useRef(0);
	const load = useCallback(async () => {
		const currentRequest = ++requestId.current;
		setLoading(true);
		setError("");
		try {
			const result = await listTenantSuppliers({
				search: query.trim(),
				page,
				pageSize: PAGE_SIZE,
			});
			if (currentRequest !== requestId.current) return;
			setItems(result.items);
			setTotal(result.total);
		} catch (e) {
			if (currentRequest !== requestId.current) return;
			setError(
				e instanceof Error
					? e.message
					: "Không thể tải danh sách nhà cung cấp.",
			);
		} finally {
			if (currentRequest === requestId.current) setLoading(false);
		}
	}, [page, query]);
	useEffect(() => {
		const timer = setTimeout(() => void load(), 250);
		return () => clearTimeout(timer);
	}, [load]);
	async function remove(id: string) {
		if (
			!window.confirm(
				"Xóa nhà cung cấp này? Lịch sử liên quan vẫn được giữ lại.",
			)
		)
			return;
		setDeleting(id);
		setError("");
		try {
			await deleteTenantSupplier(id);
			await load();
		} catch (e) {
			setError(e instanceof Error ? e.message : "Không thể xóa nhà cung cấp.");
		} finally {
			setDeleting(null);
		}
	}
	if (loading) return <ListSkeleton withToolbar rows={6} />;
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	return (
		<div className="flex w-full flex-col gap-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-bold tracking-tight text-foreground">
							Nhà cung cấp
						</h1>
						<span className="rounded-full bg-[#e3f2fd] px-2.5 py-0.5 text-sm font-semibold text-[#1565c0]">
							{total}
						</span>
					</div>
					<p className="text-base text-[#616161]">
						Đối tác nhập hàng — theo dõi liên hệ và công nợ phải trả.
					</p>
				</div>
				<Link
					href="/nha-cung-cap/them"
					className="hidden h-11 items-center gap-2 rounded-full bg-primary px-5 text-base font-semibold text-white lg:flex"
				>
					<Plus className="size-5" aria-hidden />
					Thêm nhà cung cấp
				</Link>
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
					placeholder="Tìm tên NCC, mã, số điện thoại..."
					className="h-12 w-full rounded-[10px] border border-border bg-white pl-11 pr-4 text-base focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
				/>
			</div>
			{error ? (
				<div
					role="alert"
					className="rounded-[10px] border border-[#f0b8b5] bg-[#fff5f4] p-4 text-base text-[#b42318]"
				>
					{error}
					<button
						type="button"
						onClick={() => void load()}
						className="ml-3 font-semibold underline"
					>
						Thử lại
					</button>
				</div>
			) : null}
			{items.length === 0 ? (
				<EmptyState hasSearch={Boolean(query.trim())} />
			) : (
				<>
					<div className="flex flex-col gap-3 lg:hidden">
						{items.map((supplier) => (
							<SupplierCard key={supplier.id} supplier={supplier} />
						))}
					</div>
					<div className="hidden flex-col gap-3 lg:flex">
						<div className="overflow-hidden rounded-[16px] border border-border bg-card shadow-card">
							<table className="w-full border-collapse text-left">
								<thead>
									<tr className="bg-[#f5f5f5] text-sm text-[#616161]">
										<th className="px-4 py-3">Mã NCC</th>
										<th className="px-4 py-3">Nhà cung cấp</th>
										<th className="px-4 py-3">Loại</th>
										<th className="px-4 py-3">Số điện thoại</th>
										<th className="px-4 py-3 text-right">Phải trả</th>
										<th className="w-20 px-2 py-3" />
									</tr>
								</thead>
								<tbody>
									{items.map((s) => (
										<tr
											key={s.id}
											className="border-t border-border hover:bg-accent"
										>
											<td className="px-4 py-3">
												<Link
													href={`/nha-cung-cap/${s.id}`}
													className="flex items-center gap-3"
												>
													<span className="flex size-9 items-center justify-center rounded-[10px] bg-[#1a6fa8]">
														<Truck
															className="size-4.5 text-white"
															aria-hidden
														/>
													</span>
													<span className="font-semibold">{s.code}</span>
												</Link>
											</td>
											<td className="px-4 py-3">
												<span className="font-medium">{s.name}</span>
												{s.address ? (
													<span className="block truncate text-sm text-[#9e9e9e]">
														{s.address}
													</span>
												) : null}
											</td>
											<td className="px-4 py-3 text-[#616161]">
												{supplierTypeLabel(s.supplierType)}
											</td>
											<td className="px-4 py-3 text-[#616161]">
												{s.phone ?? "—"}
											</td>
											<td className="px-4 py-3 text-right font-bold">
												{s.balance > 0 ? (
													<span className="text-[#f57f17]">
														{formatVND(s.balance)}₫
													</span>
												) : (
													<span className="text-[#9e9e9e]">—</span>
												)}
											</td>
											<td className="px-2 py-3">
												<div className="flex items-center justify-end gap-1">
													<Link
														href={`/nha-cung-cap/${s.id}/sua`}
														aria-label={`Sửa ${s.name}`}
														className="flex size-9 items-center justify-center rounded-[8px] hover:bg-[#f5f5f5]"
													>
														<Pencil className="size-4" aria-hidden />
													</Link>
													<button
														type="button"
														disabled={deleting === s.id}
														onClick={() => void remove(s.id)}
														aria-label={`Xóa ${s.name}`}
														className="flex size-9 items-center justify-center rounded-[8px] text-destructive hover:bg-[#fdecea] disabled:opacity-50"
													>
														<Trash2 className="size-4" aria-hidden />
													</button>
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
					<DataPagination
						page={page}
						pageCount={pageCount}
						total={total}
						pageSize={PAGE_SIZE}
						noun="nhà cung cấp"
						onPage={setPage}
					/>
				</>
			)}
			<Link
				href="/nha-cung-cap/them"
				aria-label="Thêm nhà cung cấp"
				className="fixed bottom-fab-safe right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-primary px-5 text-base font-semibold text-white shadow-[0_8px_20px_rgba(76,175,80,0.4)] lg:hidden"
			>
				<Plus className="size-6" aria-hidden />
				Thêm NCC
			</Link>
		</div>
	);
}
function EmptyState({ hasSearch }: { hasSearch: boolean }) {
	return (
		<div className="flex flex-col items-center gap-4 rounded-[16px] border border-dashed border-border bg-card px-6 py-14 text-center">
			<span className="flex size-16 items-center justify-center rounded-full bg-[#f5f5f5]">
				<Truck className="size-8 text-[#9e9e9e]" aria-hidden />
			</span>
			<h2 className="text-lg font-semibold">
				{hasSearch ? "Không tìm thấy NCC nào" : "Chưa có nhà cung cấp nào"}
			</h2>
			{!hasSearch ? (
				<Link
					href="/nha-cung-cap/them"
					className="flex h-12 items-center gap-2 rounded-[10px] bg-primary px-6 text-base font-semibold text-white"
				>
					<Plus className="size-5" aria-hidden />
					Thêm nhà cung cấp
				</Link>
			) : (
				<p className="text-base text-[#616161]">Thử đổi từ khóa tìm kiếm.</p>
			)}
		</div>
	);
}
