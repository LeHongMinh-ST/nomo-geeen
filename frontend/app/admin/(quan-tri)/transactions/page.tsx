"use client";

import { ChevronLeft, ChevronRight, RefreshCw, Search, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useHasPermission } from "@/hooks/use-has-permission";
import {
	type InvoiceTransactionQuery,
	type ListInvoiceTransactionsResult,
	listInvoiceTransactions,
} from "@/lib/admin-api/transactions";
import { formatDate, formatVND } from "@/lib/format";
import { useAdminAuth } from "@/stores/admin-auth-store";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
	DRAFT: { label: "Nháp", className: "bg-[#f5f5f5] text-[#616161]" },
	ISSUED: { label: "Đã phát hành", className: "bg-[#e3f2fd] text-[#1565c0]" },
	PAID: { label: "Đã thanh toán", className: "bg-[#e8f5e9] text-[#2e7d32]" },
	OVERDUE: { label: "Quá hạn", className: "bg-[#ffebee] text-[#c62828]" },
	VOID: { label: "Đã hủy", className: "bg-[#f5f5f5] text-[#9e9e9e]" },
};

const PAYMENT_STATUS_LABEL: Record<
	string,
	{ label: string; className: string }
> = {
	PENDING: {
		label: "Chờ thanh toán",
		className: "bg-[#fff8e1] text-[#f57f17]",
	},
	SUCCEEDED: { label: "Thành công", className: "bg-[#e8f5e9] text-[#2e7d32]" },
	FAILED: { label: "Thất bại", className: "bg-[#ffebee] text-[#c62828]" },
	REFUNDED: { label: "Đã hoàn", className: "bg-[#f5f5f5] text-[#9e9e9e]" },
};

export default function AdminTransactionsPage() {
	const accessToken = useAdminAuth((s) => s.accessToken);
	const canView = useHasPermission("admin.billing:view");
	const [data, setData] = useState<ListInvoiceTransactionsResult | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [query, setQuery] = useState<InvoiceTransactionQuery>({
		page: 1,
		pageSize: 20,
	});
	const [searchTerm, setSearchTerm] = useState("");
	const [debouncedSearch, setDebouncedSearch] = useState("");

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
		return () => clearTimeout(timer);
	}, [searchTerm]);

	const load = useCallback(async () => {
		if (!accessToken || !canView) return;
		setLoading(true);
		setError(null);
		try {
			const result = await listInvoiceTransactions(accessToken, {
				...query,
				q: debouncedSearch || undefined,
			});
			setData(result);
		} catch (cause) {
			setError((cause as Error).message || "Không tải được giao dịch");
		} finally {
			setLoading(false);
		}
	}, [accessToken, canView, query, debouncedSearch]);

	useEffect(() => void load(), [load]);

	const goPage = (page: number) => setQuery((q) => ({ ...q, page }));
	const changePageSize = (pageSize: number) =>
		setQuery((q) => ({ ...q, pageSize, page: 1 }));
	const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) =>
		setSearchTerm(e.target.value);
	const clearSearch = () => setSearchTerm("");

	if (!canView) return null;

	return (
		<div className="space-y-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold tracking-tight">
						Giao dịch thanh toán
					</h1>
					<p className="text-sm text-muted-foreground">
						Sổ cái chỉ đọc — hóa đơn & thanh toán nền tảng.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<div className="relative">
						<Search
							className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
							aria-hidden
						/>
						<input
							type="search"
							value={searchTerm}
							onChange={handleSearch}
							placeholder="Tìm số hóa đơn, tên cửa hàng, slug…"
							className="h-11 w-64 rounded-[10px] border border-border bg-white pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
						/>
						{searchTerm && (
							<button
								type="button"
								onClick={clearSearch}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
								aria-label="Xóa tìm kiếm"
							>
								<X className="size-4" aria-hidden />
							</button>
						)}
					</div>
					<button
						type="button"
						onClick={() => void load()}
						disabled={loading}
						className="inline-flex h-11 items-center gap-2 rounded-[10px] border border-border bg-card px-4 text-sm font-semibold hover:bg-soft disabled:opacity-60"
					>
						<RefreshCw
							className={`size-4 ${loading ? "animate-spin" : ""}`}
							aria-hidden
						/>
						Làm mới
					</button>
				</div>
			</div>

			{error ? (
				<div
					role="alert"
					className="rounded-[10px] border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
				>
					{error}
				</div>
			) : null}

			{loading && !data ? (
				<div
					className="space-y-3"
					role="status"
					aria-busy="true"
					aria-label="Đang tải giao dịch"
				>
					{[1, 2, 3, 4, 5].map((key) => (
						<div
							key={key}
							className="h-16 animate-pulse rounded-[10px] border border-border bg-muted"
						/>
					))}
				</div>
			) : data ? (
				<>
					{data.items.length === 0 ? (
						<div className="rounded-[12px] border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
							Không có giao dịch nào khớp bộ lọc.
						</div>
					) : (
						<div className="rounded-[12px] border border-border overflow-hidden">
							<table className="w-full border-collapse text-left">
								<thead>
									<tr className="bg-muted/50 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
										<th className="px-4 py-3">Số hóa đơn</th>
										<th className="px-4 py-3">Cửa hàng</th>
										<th className="px-4 py-3">Số tiền</th>
										<th className="px-4 py-3">Trạng thái HD</th>
										<th className="px-4 py-3">Trạng thái TT</th>
										<th className="px-4 py-3">PT thanh toán</th>
										<th className="px-4 py-3">Ngày phát hành</th>
										<th className="px-4 py-3">Ngày hết hạn</th>
										<th className="w-12" aria-label="Hành động" />
									</tr>
								</thead>
								<tbody>
									{data.items.map((row) => (
										<tr
											key={row.id}
											className="border-t border-border transition-colors hover:bg-accent/50"
										>
											<td className="px-4 py-3 font-mono text-sm">
												{row.invoiceNumber}
											</td>
											<td className="px-4 py-3">
												<Link
													href={`/admin/tenants/${row.tenantId}`}
													className="font-medium hover:underline"
												>
													{row.tenantName}
												</Link>
												<p className="text-xs text-muted-foreground">
													{row.tenantSlug}
												</p>
											</td>
											<td className="px-4 py-3 font-mono text-sm font-semibold">
												{formatVND(Number(row.amount))}
											</td>
											<td className="px-4 py-3">
												{(() => {
													const s = STATUS_LABEL[row.status] ?? {
														label: row.status,
														className: "",
													};
													return (
														<span
															className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${s.className}`}
														>
															{s.label}
														</span>
													);
												})()}
											</td>
											<td className="px-4 py-3">
												{(() => {
													const s = PAYMENT_STATUS_LABEL[row.paymentStatus] ?? {
														label: row.paymentStatus,
														className: "",
													};
													return (
														<span
															className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${s.className}`}
														>
															{s.label}
														</span>
													);
												})()}
											</td>
											<td className="px-4 py-3 text-sm text-muted-foreground">
												{row.paymentMethod ?? "—"}
											</td>
											<td className="px-4 py-3 text-sm text-muted-foreground">
												{row.issuedAt ? formatDate(row.issuedAt) : "—"}
											</td>
											<td className="px-4 py-3 text-sm text-muted-foreground">
												{row.dueAt ? formatDate(row.dueAt) : "—"}
											</td>
											<td className="px-4 py-3">
												<Link
													href={`/admin/tenants/${row.tenantId}`}
													className="text-primary hover:underline text-sm"
												>
													Xem
												</Link>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}

					{data.total > data.pageSize && (
						<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<p className="text-sm text-muted-foreground">
								Trang {data.page} / {Math.ceil(data.total / data.pageSize)} —{" "}
								{data.total} kết quả
							</p>
							<div className="flex items-center gap-2">
								<select
									value={data.pageSize}
									onChange={(e) => changePageSize(Number(e.target.value))}
									className="h-10 rounded-[10px] border border-border bg-white px-3 text-sm"
								>
									{[10, 20, 50, 100].map((size) => (
										<option key={size} value={size}>
											{size} / trang
										</option>
									))}
								</select>
								<button
									type="button"
									onClick={() => goPage(data.page - 1)}
									disabled={data.page === 1}
									className="h-10 size-10 rounded-[10px] border border-border bg-card text-sm font-semibold disabled:opacity-40 hover:bg-soft"
									aria-label="Trang trước"
								>
									<ChevronLeft className="size-4 mx-auto" aria-hidden />
								</button>
								<button
									type="button"
									onClick={() => goPage(data.page + 1)}
									disabled={data.page >= Math.ceil(data.total / data.pageSize)}
									className="h-10 size-10 rounded-[10px] border border-border bg-card text-sm font-semibold disabled:opacity-40 hover:bg-soft"
									aria-label="Trang sau"
								>
									<ChevronRight className="size-4 mx-auto" aria-hidden />
								</button>
							</div>
						</div>
					)}
				</>
			) : null}
		</div>
	);
}
