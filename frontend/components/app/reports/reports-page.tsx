"use client";

import { BarChart3, Package, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ListSkeleton } from "@/components/app/shared/list-skeleton";
import { formatVND } from "@/lib/format";
import { mapTenantApiError } from "@/lib/sales-api-error";
import {
	businessGroupLabel,
	defaultReportDateRange,
	getTenantSalesSummary,
	getTenantStockSummary,
	REPORT_BUSINESS_GROUPS,
	type ReportBusinessGroupId,
	rangeErrorMessage,
	type SalesSummaryResponse,
	type StockSummaryItem,
	type StockSummaryResponse,
	validateReportDateRange,
} from "@/lib/tenant-reports-api";

type LoadState<T> = {
	data: T | null;
	loading: boolean;
	error: string | null;
};

function moneyLabel(value: string): string {
	const n = Number(value);
	if (!Number.isFinite(n)) return `${value}₫`;
	return `${formatVND(n)}₫`;
}

function nearestExpiry(item: StockSummaryItem): string | null {
	const dates = item.batches
		.map((b) => b.expiresAt)
		.filter((v): v is string => Boolean(v))
		.sort();
	return dates[0] ?? null;
}

export function ReportsPage() {
	const defaults = useMemo(() => defaultReportDateRange(), []);
	const [from, setFrom] = useState(defaults.from);
	const [to, setTo] = useState(defaults.to);
	const [rangeDraft, setRangeDraft] = useState(defaults);
	const [rangeError, setRangeError] = useState<string | null>(null);
	const [businessGroup, setBusinessGroup] = useState<
		ReportBusinessGroupId | ""
	>("");
	const [stockTick, setStockTick] = useState(0);
	const [salesTick, setSalesTick] = useState(0);

	const [stock, setStock] = useState<LoadState<StockSummaryResponse>>({
		data: null,
		loading: true,
		error: null,
	});
	const [sales, setSales] = useState<LoadState<SalesSummaryResponse>>({
		data: null,
		loading: true,
		error: null,
	});

	const groupParam = businessGroup || undefined;

	const loadStock = useCallback(() => {
		setStock((s) => ({ ...s, loading: true, error: null }));
		return getTenantStockSummary({ businessGroup: groupParam })
			.then((data) => setStock({ data, loading: false, error: null }))
			.catch((reason) =>
				setStock({
					data: null,
					loading: false,
					error: mapTenantApiError(reason, "Không thể tải báo cáo tồn kho"),
				}),
			);
	}, [groupParam]);

	const loadSales = useCallback(
		(range: { from: string; to: string }) => {
			const validated = validateReportDateRange(range);
			if (!validated.ok) {
				const message = rangeErrorMessage(validated.reason);
				setRangeError(message);
				setSales({ data: null, loading: false, error: message });
				return Promise.resolve();
			}
			setRangeError(null);
			setSales((s) => ({ ...s, loading: true, error: null }));
			return getTenantSalesSummary({ ...range, businessGroup: groupParam })
				.then((data) => setSales({ data, loading: false, error: null }))
				.catch((reason) =>
					setSales({
						data: null,
						loading: false,
						error: mapTenantApiError(reason, "Không thể tải báo cáo bán hàng"),
					}),
				);
		},
		[groupParam],
	);

	useEffect(() => {
		let active = true;
		void stockTick;
		setStock((s) => ({ ...s, loading: true, error: null }));
		getTenantStockSummary({ businessGroup: groupParam })
			.then((data) => {
				if (active) setStock({ data, loading: false, error: null });
			})
			.catch((reason) => {
				if (active)
					setStock({
						data: null,
						loading: false,
						error: mapTenantApiError(reason, "Không thể tải báo cáo tồn kho"),
					});
			});
		return () => {
			active = false;
		};
	}, [stockTick, groupParam]);

	useEffect(() => {
		let active = true;
		void salesTick;
		const range = { from, to };
		const validated = validateReportDateRange(range);
		if (!validated.ok) {
			const message = rangeErrorMessage(validated.reason);
			setRangeError(message);
			setSales({ data: null, loading: false, error: message });
			return;
		}
		setRangeError(null);
		setSales((s) => ({ ...s, loading: true, error: null }));
		getTenantSalesSummary({ ...range, businessGroup: groupParam })
			.then((data) => {
				if (active) setSales({ data, loading: false, error: null });
			})
			.catch((reason) => {
				if (active)
					setSales({
						data: null,
						loading: false,
						error: mapTenantApiError(reason, "Không thể tải báo cáo bán hàng"),
					});
			});
		return () => {
			active = false;
		};
	}, [from, to, salesTick, groupParam]);

	function applyRange() {
		const validated = validateReportDateRange(rangeDraft);
		if (!validated.ok) {
			setRangeError(rangeErrorMessage(validated.reason));
			return;
		}
		setRangeError(null);
		setFrom(rangeDraft.from);
		setTo(rangeDraft.to);
	}

	const stockItems = stock.data?.items ?? [];
	const stockGroups = stock.data?.byBusinessGroup ?? [];
	const salesGroups = sales.data?.byBusinessGroup ?? [];
	const topProducts = sales.data?.topProducts ?? [];
	const bothLoading =
		stock.loading && sales.loading && !stock.data && !sales.data;

	if (bothLoading) return <ListSkeleton withToolbar rows={5} />;

	return (
		<div className="flex w-full flex-col gap-6">
			<header className="flex flex-col gap-2">
				<div className="flex items-center gap-3">
					<span className="flex size-11 items-center justify-center rounded-[12px] bg-[#e3f2fd] text-[#1565c0]">
						<BarChart3 className="size-5" aria-hidden />
					</span>
					<div>
						<h1 className="text-2xl font-bold tracking-tight text-foreground">
							Báo cáo
						</h1>
						<p className="text-sm text-muted-foreground">
							Tóm tắt tồn kho và bán hàng theo cửa hàng hiện tại.
						</p>
					</div>
				</div>
				<p
					className="rounded-[12px] border border-border bg-[#f8f9f8] px-4 py-3 text-sm text-muted-foreground"
					data-testid="reports-scope-note"
				>
					Chưa có biểu đồ, xuất file (export) hay báo cáo kế toán đầy đủ. Có lọc
					và phân rã theo 5 nhóm kinh doanh Phase 1.
				</p>
				<label className="flex max-w-md flex-col gap-1 text-sm font-medium">
					Nhóm kinh doanh
					<select
						value={businessGroup}
						onChange={(e) =>
							setBusinessGroup(e.target.value as ReportBusinessGroupId | "")
						}
						className="min-h-12 rounded-[12px] border border-border bg-white px-3 text-base"
						data-testid="reports-business-group"
						aria-label="Nhóm kinh doanh"
					>
						<option value="">Tất cả nhóm</option>
						{REPORT_BUSINESS_GROUPS.map((g) => (
							<option key={g.id} value={g.id}>
								{g.label}
							</option>
						))}
					</select>
				</label>
			</header>

			<section
				aria-labelledby="sales-summary-heading"
				className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card"
			>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h2
							id="sales-summary-heading"
							className="text-base font-semibold text-foreground"
						>
							Bán hàng hoàn tất
						</h2>
						<p className="text-sm text-muted-foreground">
							Đơn COMPLETED trong khoảng ngày đã chọn
							{businessGroup
								? ` · lọc ${businessGroupLabel(businessGroup)}`
								: ""}
							.
						</p>
					</div>
					<button
						type="button"
						onClick={() => setSalesTick((n) => n + 1)}
						className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-border px-3 text-sm font-semibold text-foreground"
					>
						<RefreshCw className="size-4" aria-hidden />
						Tải lại
					</button>
				</div>

				<div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
					<label className="flex flex-col gap-1 text-sm font-medium">
						Từ ngày
						<input
							type="date"
							value={rangeDraft.from}
							onChange={(e) =>
								setRangeDraft((r) => ({ ...r, from: e.target.value }))
							}
							className="min-h-12 rounded-[12px] border border-border bg-white px-3 text-base"
						/>
					</label>
					<label className="flex flex-col gap-1 text-sm font-medium">
						Đến ngày
						<input
							type="date"
							value={rangeDraft.to}
							onChange={(e) =>
								setRangeDraft((r) => ({ ...r, to: e.target.value }))
							}
							className="min-h-12 rounded-[12px] border border-border bg-white px-3 text-base"
						/>
					</label>
					<div className="flex items-end">
						<button
							type="button"
							onClick={applyRange}
							className="min-h-12 w-full rounded-[12px] bg-primary px-4 font-semibold text-white sm:w-auto"
						>
							Áp dụng
						</button>
					</div>
				</div>
				{rangeError ? (
					<p role="alert" className="text-sm font-medium text-destructive">
						{rangeError}
					</p>
				) : null}

				{sales.loading ? (
					<ListSkeleton withToolbar={false} rows={3} />
				) : sales.error ? (
					<div
						role="alert"
						className="rounded-[16px] border border-dashed border-destructive bg-card px-6 py-10 text-center text-destructive"
					>
						<p>{sales.error}</p>
						<button
							type="button"
							onClick={() => void loadSales({ from, to })}
							className="mt-4 rounded-[10px] bg-primary px-4 py-2 font-semibold text-white"
						>
							Thử lại
						</button>
					</div>
				) : !sales.data || sales.data.orders === 0 ? (
					<div className="rounded-[16px] border border-dashed border-border px-6 py-10 text-center text-muted-foreground">
						Chưa có đơn bán hoàn tất trong khoảng này.
					</div>
				) : (
					<>
						<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
							<Kpi label="Số đơn" value={String(sales.data.orders)} />
							<Kpi label="Doanh thu" value={moneyLabel(sales.data.total)} />
							<Kpi label="Đã thu" value={moneyLabel(sales.data.amountPaid)} />
							<Kpi label="Ghi nợ" value={moneyLabel(sales.data.debtAmount)} />
						</div>
						{salesGroups.length > 0 ? (
							<div className="flex flex-col gap-2" data-testid="sales-by-group">
								<h3 className="text-sm font-semibold text-foreground">
									Theo nhóm kinh doanh
								</h3>
								<ul className="divide-y divide-border rounded-[12px] border border-border">
									{salesGroups.map((g) => (
										<li
											key={g.businessGroup}
											className="flex items-center justify-between gap-3 px-4 py-3"
										>
											<div className="min-w-0">
												<p className="truncate font-medium text-foreground">
													{g.label}
												</p>
												<p className="text-sm text-muted-foreground">
													{g.lineCount} dòng · SL {g.qtyBase}
												</p>
											</div>
											<p className="shrink-0 font-semibold tabular-nums text-foreground">
												{moneyLabel(g.total)}
											</p>
										</li>
									))}
								</ul>
							</div>
						) : null}
						<div className="flex flex-col gap-2">
							<h3 className="text-sm font-semibold text-foreground">
								Top sản phẩm (tối đa 10)
							</h3>
							{topProducts.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									Không có dòng bán trong khoảng này.
								</p>
							) : (
								<ul className="divide-y divide-border rounded-[12px] border border-border">
									{topProducts.map((p, index) => (
										<li
											key={p.productId}
											className="flex items-center justify-between gap-3 px-4 py-3"
										>
											<div className="min-w-0">
												<p className="truncate font-medium text-foreground">
													{index + 1}. {p.name}
												</p>
												<p className="text-sm text-muted-foreground">
													SL cơ sở: {p.qtyBase}
												</p>
											</div>
											<p className="shrink-0 font-semibold tabular-nums text-foreground">
												{moneyLabel(p.total)}
											</p>
										</li>
									))}
								</ul>
							)}
						</div>
					</>
				)}
			</section>

			<section
				aria-labelledby="stock-summary-heading"
				className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card"
			>
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h2
							id="stock-summary-heading"
							className="text-base font-semibold text-foreground"
						>
							Tồn kho
						</h2>
						<p className="text-sm text-muted-foreground">
							Tồn theo sản phẩm / kho kèm lô còn hàng
							{businessGroup
								? ` · lọc ${businessGroupLabel(businessGroup)}`
								: ""}
							.
						</p>
					</div>
					<button
						type="button"
						onClick={() => setStockTick((n) => n + 1)}
						className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-border px-3 text-sm font-semibold text-foreground"
					>
						<RefreshCw className="size-4" aria-hidden />
						Tải lại
					</button>
				</div>

				{stock.loading ? (
					<ListSkeleton withToolbar={false} rows={4} />
				) : stock.error ? (
					<div
						role="alert"
						className="rounded-[16px] border border-dashed border-destructive bg-card px-6 py-10 text-center text-destructive"
					>
						<p>{stock.error}</p>
						<button
							type="button"
							onClick={() => void loadStock()}
							className="mt-4 rounded-[10px] bg-primary px-4 py-2 font-semibold text-white"
						>
							Thử lại
						</button>
					</div>
				) : stockItems.length === 0 ? (
					<div className="rounded-[16px] border border-dashed border-border px-6 py-10 text-center text-muted-foreground">
						Chưa có dòng tồn kho để báo cáo.
					</div>
				) : (
					<>
						{stockGroups.length > 0 ? (
							<div className="flex flex-col gap-2" data-testid="stock-by-group">
								<h3 className="text-sm font-semibold text-foreground">
									Theo nhóm kinh doanh
								</h3>
								<ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
									{stockGroups.map((g) => (
										<li
											key={g.businessGroup}
											className="rounded-[12px] border border-border bg-[#f8f9f8] px-4 py-3"
										>
											<p className="text-sm font-semibold text-foreground">
												{g.label}
											</p>
											<p className="text-sm text-muted-foreground">
												{g.itemCount} dòng · SL {g.qty}
											</p>
										</li>
									))}
								</ul>
							</div>
						) : null}
						<ul className="flex flex-col gap-3">
							{stockItems.map((item) => {
								const expiry = nearestExpiry(item);
								return (
									<li
										key={`${item.warehouseId}-${item.product.id}`}
										className="flex items-start gap-3 rounded-[16px] border border-border bg-white p-4"
									>
										<span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-[#f3f8f1] text-[#3f8530]">
											<Package className="size-5" aria-hidden />
										</span>
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-start justify-between gap-2">
												<div className="min-w-0">
													<p className="truncate font-semibold text-foreground">
														{item.product.name}
													</p>
													<p className="text-sm text-muted-foreground">
														{item.product.sku} · {item.product.productKind} ·{" "}
														{businessGroupLabel(item.product.businessGroup)}
													</p>
												</div>
												<p className="font-bold tabular-nums text-foreground">
													SL {item.qty}
												</p>
											</div>
											<p className="mt-1 text-sm text-muted-foreground">
												Kho {item.warehouseId} · Giá vốn TB{" "}
												{moneyLabel(item.avgCost)} · Lô còn hàng{" "}
												{item.batches.length}
												{expiry ? ` · HSD gần nhất ${expiry.slice(0, 10)}` : ""}
											</p>
										</div>
									</li>
								);
							})}
						</ul>
					</>
				)}
			</section>
		</div>
	);
}

function Kpi({ label, value }: { label: string; value: string }) {
	return (
		<div className="rounded-[12px] border border-border bg-[#f8f9f8] px-4 py-3">
			<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
				{label}
			</p>
			<p className="mt-1 text-xl font-bold tabular-nums text-foreground">
				{value}
			</p>
		</div>
	);
}
