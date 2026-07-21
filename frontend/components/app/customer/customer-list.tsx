"use client";

import { Plus, Search, Users } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CustomerCard } from "@/components/app/customer/customer-card";
import { DataPagination } from "@/components/app/shared/data-pagination";
import { ListSkeleton } from "@/components/app/shared/list-skeleton";
import { formatVND } from "@/lib/format";
import {
	type Customer,
	customerTypeLabel,
	deleteCustomer,
	listCustomers,
} from "@/lib/tenant-customers-api";

const PAGE_SIZE = 10;

export function CustomerList() {
	const [items, setItems] = useState<Customer[]>([]);
	const [total, setTotal] = useState(0);
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const load = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			const result = await listCustomers({
				search: search.trim() || undefined,
				page,
				pageSize: PAGE_SIZE,
			});
			setItems(result.items);
			setTotal(result.total);
		} catch {
			setError("Không thể tải danh sách khách hàng.");
		} finally {
			setLoading(false);
		}
	}, [search, page]);

	useEffect(() => {
		const timer = setTimeout(() => void load(), 250);
		return () => clearTimeout(timer);
	}, [load]);

	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

	async function handleDelete(id: string) {
		if (
			!window.confirm("Xóa khách hàng này? Dữ liệu lịch sử vẫn được giữ lại.")
		)
			return;
		try {
			await deleteCustomer(id);
			await load();
		} catch {
			setError("Không thể xóa khách hàng. Vui lòng thử lại.");
		}
	}

	return (
		<div className="flex w-full flex-col gap-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-bold tracking-tight text-foreground">
							Khách hàng
						</h1>
						<span className="rounded-full bg-[#e3f2fd] px-2.5 py-0.5 text-sm font-semibold text-[#1565c0]">
							{total}
						</span>
					</div>
					<p className="text-base text-[#616161]">
						Danh bạ khách mua hàng — tìm nhanh theo tên hoặc số điện thoại.
					</p>
				</div>
				<Link
					href="/khach-hang/them"
					className="flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-base font-semibold text-white"
				>
					<Plus className="size-5" />
					Thêm khách hàng
				</Link>
			</div>
			<div className="relative">
				<Search className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-[#9e9e9e]" />
				<input
					type="search"
					value={search}
					onChange={(event) => {
						setPage(1);
						setSearch(event.target.value);
					}}
					placeholder="Tìm tên khách, số điện thoại, mã khách..."
					className="h-12 w-full rounded-[10px] border border-border bg-white pl-11 pr-4 text-base"
				/>
			</div>
			{error && items.length > 0 ? (
				<div
					role="alert"
					className="rounded-[10px] border border-destructive/30 bg-[#fff5f4] p-3 text-sm text-destructive"
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
			{loading ? (
				<ListSkeleton withToolbar rows={6} />
			) : error && items.length === 0 ? (
				<ErrorState message={error} onRetry={load} />
			) : items.length === 0 ? (
				<EmptyState />
			) : (
				<>
					<div className="flex flex-col gap-3 lg:hidden">
						{items.map((item) => (
							<CustomerCard key={item.id} customer={item} />
						))}
					</div>
					<div className="hidden overflow-hidden rounded-[16px] border border-border bg-card shadow-card lg:block">
						<table className="w-full border-collapse text-left">
							<thead>
								<tr className="bg-[#f5f5f5] text-sm text-[#616161]">
									<th className="px-4 py-3">Khách hàng</th>
									<th className="px-4 py-3">Số điện thoại</th>
									<th className="px-4 py-3">Loại</th>
									<th className="px-4 py-3 text-right">Công nợ</th>
									<th className="px-4 py-3">Thao tác</th>
								</tr>
							</thead>
							<tbody>
								{items.map((item) => (
									<tr key={item.id} className="border-t border-border">
										<td className="px-4 py-3">
											<Link
												className="font-semibold"
												href={`/khach-hang/${item.id}`}
											>
												{item.name}
											</Link>
										</td>
										<td className="px-4 py-3 text-[#616161]">
											{item.phone || "—"}
										</td>
										<td className="px-4 py-3 text-[#616161]">
											{item.type ? customerTypeLabel[item.type] : "—"}
										</td>
										<td className="px-4 py-3 text-right font-bold">
											{item.balance > 0 ? (
												<span className="text-[#f57f17]">
													{formatVND(item.balance)}₫
												</span>
											) : (
												"—"
											)}
										</td>
										<td className="px-4 py-3">
											<div className="flex gap-3">
												<Link
													href={`/khach-hang/${item.id}/sua`}
													className="text-primary"
												>
													Sửa
												</Link>
												<button
													type="button"
													onClick={() => void handleDelete(item.id)}
													className="text-destructive"
												>
													Xóa
												</button>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
					<DataPagination
						page={page}
						pageCount={pageCount}
						total={total}
						pageSize={PAGE_SIZE}
						noun="khách hàng"
						onPage={setPage}
					/>
				</>
			)}
		</div>
	);
}

function EmptyState() {
	return (
		<div className="flex flex-col items-center gap-3 rounded-[16px] border border-dashed border-border bg-card px-6 py-14 text-center">
			<Users className="size-10 text-[#9e9e9e]" />
			<h2 className="text-lg font-semibold">Chưa có khách hàng phù hợp</h2>
			<p className="text-[#616161]">
				Thử đổi từ khóa hoặc thêm khách hàng mới.
			</p>
		</div>
	);
}
function ErrorState({
	message,
	onRetry,
}: {
	message: string;
	onRetry: () => void;
}) {
	return (
		<div className="rounded-[16px] border border-destructive/30 bg-card p-8 text-center">
			<p className="text-destructive">{message}</p>
			<button
				type="button"
				onClick={onRetry}
				className="mt-4 rounded-[10px] bg-primary px-5 py-2 font-semibold text-white"
			>
				Thử lại
			</button>
		</div>
	);
}
