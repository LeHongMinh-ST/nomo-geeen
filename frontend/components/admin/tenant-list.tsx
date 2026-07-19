"use client";

import {
	Download,
	Inbox,
	Plus,
	RefreshCcw,
	Search,
	Store,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DataPagination } from "@/components/app/shared/data-pagination";
import { ListSkeleton } from "@/components/app/shared/list-skeleton";
import { LoadMoreSentinel } from "@/components/app/shared/load-more-sentinel";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { TenantListItem, TenantStatus } from "@/lib/admin-api/tenants";
import { Can } from "./can-permission";

const STATUS_LABEL: Record<TenantStatus, string> = {
	ACTIVE: "Hoạt động",
	SUSPENDED: "Tạm ngưng",
	LOCKED: "Khóa",
};

// Bảng màu trạng thái (DESIGN.md §13) — cùng palette Success/Warning/Error
// mà module Công nợ dùng (frontend/lib/debts.ts), giữ nhất quán toàn app.
const STATUS_CLASS: Record<TenantStatus, string> = {
	ACTIVE: "bg-[#e8f5e9] text-[#2e7d32]",
	SUSPENDED: "bg-[#fff8e1] text-[#f57f17]",
	LOCKED: "bg-[#ffebee] text-[#c62828]",
};

// Solid dot color for KPI strip — same hue as the badge but denser.
const STATUS_DOT: Record<TenantStatus, string> = {
	ACTIVE: "bg-[#43A047]",
	SUSPENDED: "bg-[#F9A825]",
	LOCKED: "bg-[#E53935]",
};

const TYPE_LABEL: Record<string, string> = {
	HOUSEHOLD: "Hộ gia đình",
	RETAIL_DEALER: "Đại lý",
	COOPERATIVE: "Hợp tác xã",
	DISTRIBUTOR: "Nhà phân phối",
	FARM: "Trang trại",
};

const MODE_LABEL: Record<string, string> = {
	SIMPLE: "Đơn giản",
	ADVANCED: "Nâng cao",
};

const STATUS_FILTER_OPTIONS = [
	{ value: "", label: "Tất cả" },
	{ value: "ACTIVE", label: STATUS_LABEL.ACTIVE },
	{ value: "SUSPENDED", label: STATUS_LABEL.SUSPENDED },
	{ value: "LOCKED", label: STATUS_LABEL.LOCKED },
];

interface KpiCounts {
	total: number;
	active: number;
	suspended: number;
	locked: number;
}

interface Props {
	items: TenantListItem[];
	total: number;
	page: number;
	pageSize: number;
	q: string;
	status: TenantStatus | "";
	loading: boolean;
	error: string | null;
	mobileItems: TenantListItem[];
	mobileTotal: number;
	mobileLoading: boolean;
	onLoadMoreMobile: () => void;
	onFilter: (next: { q?: string; status?: TenantStatus | "" }) => Promise<void>;
	onPageChange: (page: number, pageSize?: number) => Promise<void>;
	onRefresh: () => Promise<void>;
	onExport: () => Promise<void>;
	/** Optional — nếu cha đã chuẩn bị sẵn thì KPI strip sẽ fill ngay, tránh 3 HTTP call. */
	kpi?: KpiCounts | null;
}

export function TenantList({
	items,
	total,
	page,
	pageSize,
	q,
	status,
	loading,
	error,
	mobileItems,
	mobileTotal,
	mobileLoading,
	onLoadMoreMobile,
	onFilter,
	onPageChange,
	onRefresh,
	onExport,
	kpi: kpiProp,
}: Props) {
	const [draftQ, setDraftQ] = useState(q);
	const [exporting, setExporting] = useState(false);
	const [actionError, setActionError] = useState<string | null>(null);
	const kpi = kpiProp ?? null;

	const pageCount = Math.max(1, Math.ceil(total / pageSize));

	async function submitSearch(e: React.FormEvent) {
		e.preventDefault();
		const next = draftQ.trim().slice(0, 100);
		setDraftQ(next);
		await onFilter({ q: next });
	}

	async function handleExport() {
		setActionError(null);
		setExporting(true);
		try {
			await onExport();
		} catch (err) {
			setActionError((err as Error).message);
		} finally {
			setExporting(false);
		}
	}

	// Skeleton chỉ hiện khi đang tải VÀ đã có tín hiệu rằng có dữ liệu (total > 0).
	// Nếu total = 0 thì cho render bảng rỗng (EmptyTable) ngay, tránh flash
	// 6 hàng skeleton rồi mới hiện colspan — trông như có dữ liệu trong khi không.
	const initialLoading =
		(loading && items.length === 0 && total > 0) ||
		(mobileLoading && mobileItems.length === 0 && mobileTotal > 0);

	return (
		<div className="space-y-5">
			{/* Page header — DESIGN.md §11 */}
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<div className="flex items-center gap-2">
						<h1 className="text-[22px] font-bold tracking-tight text-foreground">
							Cửa hàng
						</h1>
						<span className="inline-flex items-center rounded-full bg-[#E3F2FD] px-2.5 py-0.5 text-xs font-semibold text-[#1565C0]">
							{total}
						</span>
					</div>
					<p className="mt-1 text-sm text-muted-foreground">
						Quản lý tenant / cửa hàng trên nền tảng
					</p>
				</div>
				<div className="hidden items-center gap-2 lg:flex">
					<button
						type="button"
						onClick={() => void onRefresh()}
						className="inline-flex size-10 items-center justify-center rounded-[10px] border border-border bg-card text-muted-foreground transition-colors hover:bg-soft"
						aria-label="Làm mới"
					>
						<RefreshCcw className="size-4" aria-hidden />
					</button>
					<Can permission="admin.tenant:export">
						<button
							type="button"
							onClick={() => void handleExport()}
							disabled={exporting}
							className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-border bg-card px-4 text-sm font-semibold text-foreground transition-colors hover:bg-soft disabled:opacity-60"
						>
							<Download className="size-4" aria-hidden />
							{exporting ? "Đang xuất…" : "Xuất CSV"}
						</button>
					</Can>
				</div>
			</div>

			{/* KPI strip — DESIGN.md §18 (Stripe-style). 4 ô ngang từ md+, 2x2 mobile. */}
			<KpiStrip kpi={kpi} status={status} total={total} />

			{/* Toolbar lọc — desktop hiển thị 1 hàng ngang, mobile/tablet xếp dọc. */}
			<div className="flex flex-col gap-3 lg:flex-row lg:items-end">
				<form onSubmit={(e) => void submitSearch(e)} className="block flex-1">
					<label className="block">
						<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
							Tìm kiếm
						</span>
						<div className="relative mt-1.5">
							<Search
								className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
								aria-hidden
							/>
							<input
								type="search"
								value={draftQ}
								maxLength={100}
								onChange={(e) => setDraftQ(e.target.value)}
								placeholder="Tên hoặc slug… — nhấn Enter để tìm"
								className="h-11 w-full rounded-[10px] border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
							/>
						</div>
					</label>
				</form>

				<div className="block lg:w-[260px]">
					<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
						Trạng thái
					</span>
					<Select
						value={status}
						onValueChange={(v) =>
							void onFilter({ status: v as TenantStatus | "" })
						}
					>
						<SelectTrigger
							aria-label="Lọc theo trạng thái"
							className="mt-1.5 h-11 w-full"
						>
							<SelectValue placeholder="Tất cả" />
						</SelectTrigger>
						<SelectContent>
							{STATUS_FILTER_OPTIONS.map((o) => (
								<SelectItem key={o.value} value={o.value}>
									{o.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			{actionError || error ? (
				<div
					role="alert"
					className="rounded-[10px] border border-destructive/40 bg-destructive/5 px-4 py-2 text-sm text-destructive"
				>
					{actionError ?? error}
				</div>
			) : null}

			{initialLoading ? (
				<ListSkeleton withToolbar={false} rows={6} />
			) : (
				<>
					{/* Mobile/tablet — card list + tải dần (DESIGN.md §12.1, §12.3) */}
					<div className="flex flex-col gap-3 lg:hidden">
						{mobileItems.length === 0 ? (
							<EmptyState />
						) : (
							<>
								{mobileItems.map((t, idx) => (
									<div
										key={t.id}
										className="animate-in fade-in slide-in-from-bottom-2 duration-200 fill-mode-both"
										style={{ animationDelay: `${Math.min(idx, 8) * 30}ms` }}
									>
										<TenantCard tenant={t} />
									</div>
								))}
								{mobileItems.length < mobileTotal ? (
									<LoadMoreSentinel onReach={onLoadMoreMobile} />
								) : (
									<p className="py-2 text-center text-sm text-muted-foreground">
										Đã hiển thị tất cả {mobileItems.length} cửa hàng
									</p>
								)}
							</>
						)}
					</div>

					{/* Desktop — bảng đầy đủ + phân trang (DESIGN.md §12.2, §12.3).
					    Admin ưu tiên PC nên luôn render <table> kể cả khi rỗng — nhìn
					    header cột quen thuộc + 1 row colspan 6 chứa CTA Thêm cửa hàng
					    ở giữa rõ ràng hơn card dashed. */}
					<div className="hidden flex-col gap-3 lg:flex">
						<div className="overflow-hidden rounded-[14px] border border-border bg-card">
							<table className="w-full border-collapse text-left">
								<thead>
									<tr className="bg-soft text-sm text-muted-foreground">
										<th
											scope="col"
											className="min-w-[220px] px-4 py-3 font-semibold"
										>
											Cửa hàng
										</th>
										<th
											scope="col"
											className="min-w-[120px] whitespace-nowrap px-4 py-3 font-semibold"
										>
											Loại
										</th>
										<th
											scope="col"
											className="min-w-[100px] whitespace-nowrap px-4 py-3 font-semibold"
										>
											Chế độ
										</th>
										<th
											scope="col"
											className="min-w-[110px] whitespace-nowrap px-4 py-3 font-semibold"
										>
											Trạng thái
										</th>
										<th
											scope="col"
											className="min-w-[150px] whitespace-nowrap px-4 py-3 font-semibold"
										>
											Tạo lúc
										</th>
										<th
											scope="col"
											className="min-w-[90px] whitespace-nowrap px-4 py-3 text-right font-semibold"
										>
											Chi tiết
										</th>
									</tr>
								</thead>
								<tbody>
									{items.length === 0 ? (
										<tr>
											<td colSpan={6} className="p-0">
												<EmptyTable />
											</td>
										</tr>
									) : (
										items.map((t, idx) => (
											<tr
												key={t.id}
												className="border-t border-border align-middle transition-colors hover:bg-soft animate-in fade-in duration-150 fill-mode-both"
												style={{ animationDelay: `${Math.min(idx, 9) * 25}ms` }}
											>
												<td className="px-4 py-3.5">
													<div className="text-sm font-semibold text-foreground">
														{t.name}
													</div>
													<div className="font-mono text-sm text-muted-foreground">
														{t.slug}
													</div>
												</td>
												<td className="whitespace-nowrap px-4 py-3.5 text-sm text-[#616161]">
													{TYPE_LABEL[t.tenantType] ?? t.tenantType}
												</td>
												<td className="whitespace-nowrap px-4 py-3.5 text-sm text-[#616161]">
													{MODE_LABEL[t.mode] ?? t.mode}
												</td>
												<td className="whitespace-nowrap px-4 py-3.5">
													<span
														className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-sm font-semibold ${STATUS_CLASS[t.status]}`}
													>
														<span
															aria-hidden
															className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[t.status]}`}
														/>
														{STATUS_LABEL[t.status]}
													</span>
												</td>
												<td className="whitespace-nowrap px-4 py-3.5 text-sm text-muted-foreground">
													{new Date(t.createdAt).toLocaleString("vi-VN")}
												</td>
												<td className="whitespace-nowrap px-4 py-3.5 text-right">
													<Link
														href={`/admin/tenants/${t.id}`}
														className="text-sm font-semibold text-primary hover:underline"
													>
														Xem
													</Link>
												</td>
											</tr>
										))
									)}
								</tbody>
							</table>
						</div>

						{items.length > 0 ? (
							<DataPagination
								page={page}
								pageCount={pageCount}
								total={total}
								pageSize={pageSize}
								noun="cửa hàng"
								onPage={(p) => void onPageChange(p)}
							/>
						) : null}
					</div>
				</>
			)}

			{/* FAB mobile — DESIGN.md §7: pill nổi bật, lg:hidden.
			    Admin portal không có bottom nav → đặt bottom-6.
			    Chưa có route tạo cửa hàng → dẫn về danh sách User quản trị. */}
			<Can permission="admin.tenant:edit">
				<Link
					href="/admin/admin-users"
					aria-label="Thêm cửa hàng"
					className="fixed bottom-6 right-4 z-20 inline-flex h-12 items-center gap-2 rounded-full bg-primary pl-3 pr-4 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(92,173,69,0.35)] transition-transform duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] lg:hidden"
				>
					<span className="flex size-7 items-center justify-center rounded-full bg-white/20">
						<Plus className="size-4" aria-hidden />
					</span>
					Tạo mới
				</Link>
			</Can>
		</div>
	);
}

/**
 * 4-card KPI strip. Mobile: 2x2. ≥sm: 4 cột. Stagger fade-in 60ms.
 * Hiển thị "—" khi chưa có dữ liệu (tránh flash 0 sai).
 */
function KpiStrip({
	kpi,
	status,
	total,
}: {
	kpi: KpiCounts | null;
	status: TenantStatus | "";
	total: number;
}) {
	const cards: Array<{
		key: TenantStatus | "ALL";
		label: string;
		value: number | null;
		dot: string;
		emphasis: boolean;
	}> = [
		{
			key: "ALL",
			label: "Tổng cửa hàng",
			value: total,
			dot: "bg-[#1B1F1B]",
			emphasis: true,
		},
		{
			key: "ACTIVE",
			label: STATUS_LABEL.ACTIVE,
			value: kpi?.active ?? null,
			dot: STATUS_DOT.ACTIVE,
			emphasis: false,
		},
		{
			key: "SUSPENDED",
			label: STATUS_LABEL.SUSPENDED,
			value: kpi?.suspended ?? null,
			dot: STATUS_DOT.SUSPENDED,
			emphasis: false,
		},
		{
			key: "LOCKED",
			label: STATUS_LABEL.LOCKED,
			value: kpi?.locked ?? null,
			dot: STATUS_DOT.LOCKED,
			emphasis: false,
		},
	];

	// Khi đã filter theo 1 status, các nhóm khác giữ "—" để khỏi gây hiểu nhầm.
	const isDimmed = (key: TenantStatus | "ALL") =>
		status !== "" && key !== "ALL" && key !== status;

	return (
		<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
			{cards.map((c, idx) => (
				<div
					key={c.key}
					className={`rounded-[14px] border border-border bg-card p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-opacity duration-200 animate-in fade-in slide-in-from-bottom-1 fill-mode-both ${
						isDimmed(c.key) ? "opacity-40" : "opacity-100"
					}`}
					style={{ animationDelay: `${idx * 60}ms` }}
				>
					<div className="flex items-center gap-1.5">
						<span aria-hidden className={`size-1.5 rounded-full ${c.dot}`} />
						<p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
							{c.label}
						</p>
					</div>
					<p
						className={`mt-2 font-bold tabular-nums tracking-tight ${
							c.emphasis ? "text-[26px]" : "text-[22px]"
						} text-foreground`}
					>
						{c.value === null ? (
							<span
								className="inline-block size-6 animate-pulse rounded bg-soft"
								aria-hidden
							/>
						) : (
							c.value.toLocaleString("vi-VN")
						)}
					</p>
				</div>
			))}
		</div>
	);
}

/** Thẻ 1 cửa hàng cho mobile/tablet (DESIGN.md §12.1). */
function TenantCard({ tenant }: { tenant: TenantListItem }) {
	return (
		<Link
			href={`/admin/tenants/${tenant.id}`}
			className="group flex flex-col gap-3 rounded-[16px] border border-border bg-card p-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:border-primary/30 hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] active:scale-[0.99]"
		>
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0 flex-1">
					<span className="block truncate text-base font-semibold text-foreground group-hover:text-primary">
						{tenant.name}
					</span>
					<span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
						{tenant.slug}
					</span>
				</div>
				<span
					className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASS[tenant.status]}`}
				>
					<span
						aria-hidden
						className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[tenant.status]}`}
					/>
					{STATUS_LABEL[tenant.status]}
				</span>
			</div>
			<div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-sm">
				<span className="text-xs text-muted-foreground">
					{TYPE_LABEL[tenant.tenantType] ?? tenant.tenantType}
				</span>
				<span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
					<TrendingUp className="size-3.5" aria-hidden />
					{MODE_LABEL[tenant.mode] ?? tenant.mode}
				</span>
			</div>
		</Link>
	);
}

function EmptyState() {
	return (
		<div className="rounded-[16px] border border-dashed border-border bg-card/50 px-4 py-12 text-center">
			<div className="mx-auto flex max-w-xs flex-col items-center gap-3">
				<span className="flex size-14 items-center justify-center rounded-full bg-soft">
					<Inbox className="size-7 text-muted-foreground" aria-hidden />
				</span>
				<div className="space-y-1">
					<p className="text-base font-semibold text-foreground">
						Chưa có cửa hàng nào
					</p>
					<p className="text-sm text-muted-foreground">
						Cửa hàng sẽ xuất hiện khi có tenant đăng ký hoặc bạn thay đổi bộ
						lọc.
					</p>
				</div>
				<Store className="size-4 text-muted-foreground/40" aria-hidden />
			</div>
		</div>
	);
}

/**
 * Bảng rỗng cho desktop (PC-first). Render giữa <tbody> qua 1 row colspan đầy
 * đủ, header cột vẫn hiện → admin nhận diện "đang ở danh sách cửa hàng" ngay.
 * Không có route tạo cửa hàng — CTA dẫn về danh sách User quản trị (nơi thêm
 * user mới cho tenant hiện có, hành động tạo liên quan duy nhất hiện có).
 */
function EmptyTable() {
	return (
		<div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
			<span
				aria-hidden
				className="flex size-16 items-center justify-center rounded-2xl bg-soft"
			>
				<Store className="size-8 text-muted-foreground" />
			</span>
			<div className="space-y-1">
				<p className="text-lg font-semibold text-foreground">
					Chưa có cửa hàng nào
				</p>
				<p className="mx-auto max-w-md text-sm text-muted-foreground">
					Thay đổi bộ lọc, hoặc thêm user quản trị cho một tenant để bắt đầu
					quản lý cửa hàng trên nền tảng.
				</p>
			</div>
			<Link
				href="/admin/admin-users"
				className="inline-flex h-11 items-center gap-2 rounded-[10px] bg-primary px-5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(92,173,69,0.25)] transition-all duration-200 ease-out hover:bg-primary/90 hover:shadow-[0_6px_20px_rgba(92,173,69,0.32)] active:scale-[0.98]"
			>
				<Plus className="size-4" aria-hidden />
				Thêm cửa hàng
			</Link>
		</div>
	);
}
