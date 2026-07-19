"use client";

import {
	HandCoins,
	Phone,
	Search,
	TrendingDown,
	TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DataPagination } from "@/components/app/shared/data-pagination";
import { ListFilterBar } from "@/components/app/shared/list-filter-bar";
import { ListSkeleton } from "@/components/app/shared/list-skeleton";
import { LoadMoreSentinel } from "@/components/app/shared/load-more-sentinel";
import {
	compareDebtUrgency,
	countOverdue,
	type DebtAccount,
	type DebtDirection,
	type DebtPaymentMethod,
	debtAmountColor,
	debtDueText,
	debtOutstanding,
	debtStatus,
	debtStatusBadgeClass,
	debtStatusLabel,
	payables,
	receivables,
	sumOutstanding,
	withPayment,
} from "@/lib/debts";
import { formatVND } from "@/lib/format";
import { CollectPaymentSheet } from "./collect-payment-sheet";
import { DebtCard } from "./debt-card";

/**
 * Danh sách công nợ — responsive (DESIGN.md §12, §16).
 * Segmented chọn chiều nợ (Phải thu / Phải trả) + khối tổng nổi bật.
 * Mobile: card list + tải dần. Desktop (lg+): bảng đầy đủ + phân trang.
 * Chỉ liệt kê tài khoản đang còn nợ; sắp xếp quá hạn → sắp đến hạn → nợ nhiều nhất.
 */

type StatusFilter = "all" | "current" | "overdue";

const statusFilters: { value: StatusFilter; label: string }[] = [
	{ value: "all", label: "Tất cả" },
	{ value: "current", label: "Còn hạn" },
	{ value: "overdue", label: "Quá hạn" },
];

const PAGE_SIZE = 10;
const MOBILE_BATCH = 8;

export function DebtList() {
	const [direction, setDirection] = useState<DebtDirection>("receivable");
	// Giữ cả hai chiều trong state để cập nhật khi thu/trả tiền.
	const [accounts, setAccounts] = useState<DebtAccount[]>([
		...receivables,
		...payables,
	]);
	const [query, setQuery] = useState("");
	const [status, setStatus] = useState<StatusFilter>("all");
	const [page, setPage] = useState(1);
	const [mobileCount, setMobileCount] = useState(MOBILE_BATCH);
	const [collecting, setCollecting] = useState<DebtAccount | null>(null);
	const [toast, setToast] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const timer = setTimeout(() => setLoading(false), 450);
		return () => clearTimeout(timer);
	}, []);

	const isReceivable = direction === "receivable";

	// Tài khoản theo chiều nợ hiện tại, chỉ giữ khoản còn nợ.
	const owing = useMemo(
		() =>
			accounts.filter(
				(a) => a.direction === direction && debtOutstanding(a) > 0,
			),
		[accounts, direction],
	);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return owing
			.filter((a) => {
				if (status === "overdue" && debtStatus(a) !== "overdue") return false;
				if (status === "current" && debtStatus(a) === "overdue") return false;
				if (!q) return true;
				return a.name.toLowerCase().includes(q) || a.phone.includes(q);
			})
			.sort(compareDebtUrgency);
	}, [owing, query, status]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset khi tiêu chí lọc đổi
	useEffect(() => {
		setPage(1);
		setMobileCount(MOBILE_BATCH);
	}, [query, status, direction]);

	// Tự ẩn toast.
	useEffect(() => {
		if (!toast) return;
		const t = setTimeout(() => setToast(null), 2600);
		return () => clearTimeout(t);
	}, [toast]);

	const totalOutstanding = sumOutstanding(owing);
	const overdueCount = countOverdue(owing);

	const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const safePage = Math.min(page, pageCount);
	const pageRows = filtered.slice(
		(safePage - 1) * PAGE_SIZE,
		safePage * PAGE_SIZE,
	);
	const mobileRows = filtered.slice(0, mobileCount);
	const mobileHasMore = mobileCount < filtered.length;

	function handleConfirm(amount: number, method: DebtPaymentMethod) {
		if (!collecting) return;
		const verb = collecting.direction === "receivable" ? "Đã thu" : "Đã trả";
		// TODO: gọi API ghi nhận thu/trả công nợ khi backend sẵn sàng.
		setAccounts((current) =>
			current.map((a) =>
				a.id === collecting.id ? withPayment(a, amount, method) : a,
			),
		);
		setToast(`${verb} ${formatVND(amount)}₫ · ${collecting.name}`);
		setCollecting(null);
	}

	if (loading) return <ListSkeleton withToolbar rows={6} />;

	return (
		<div className="flex w-full flex-col gap-5">
			{/* Page header */}
			<div className="flex flex-col gap-1">
				<div className="flex items-center gap-2">
					<h1 className="text-2xl font-bold tracking-tight text-foreground">
						Công nợ
					</h1>
					<span className="rounded-full bg-[#e3f2fd] px-2.5 py-0.5 text-sm font-semibold text-[#1565c0]">
						{owing.length}
					</span>
				</div>
				<p className="text-base text-[#616161]">
					{isReceivable
						? "Khách đang nợ cửa hàng — thu tiền, trả nhiều lần."
						: "Cửa hàng đang nợ nhà cung cấp — theo dõi và trả dần."}
				</p>
			</div>

			{/* Segmented chọn chiều nợ */}
			<div className="grid grid-cols-2 gap-1 rounded-[12px] bg-[#f0f2f1] p-1">
				<button
					type="button"
					onClick={() => setDirection("receivable")}
					className={`flex h-10 items-center justify-center gap-2 rounded-[9px] text-sm font-semibold transition-colors duration-200 ease-out ${
						isReceivable
							? "bg-card text-primary shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
							: "text-[#616161] hover:text-foreground"
					}`}
				>
					<TrendingUp className="size-4.5" aria-hidden />
					Phải thu
				</button>
				<button
					type="button"
					onClick={() => setDirection("payable")}
					className={`flex h-10 items-center justify-center gap-2 rounded-[9px] text-sm font-semibold transition-colors duration-200 ease-out ${
						!isReceivable
							? "bg-card text-primary shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
							: "text-[#616161] hover:text-foreground"
					}`}
				>
					<TrendingDown className="size-4.5" aria-hidden />
					Phải trả
				</button>
			</div>

			{/* Khối tổng */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div className="flex flex-col gap-1.5 rounded-[16px] border border-border bg-card p-5 shadow-card">
					<span className="text-sm text-[#616161]">
						{isReceivable ? "Tổng phải thu" : "Tổng phải trả"}
					</span>
					<span className="text-3xl font-bold leading-none tracking-tight text-[#f57f17]">
						{formatVND(totalOutstanding)}
						<span className="ml-1 text-xl">₫</span>
					</span>
				</div>
				<div className="flex flex-col gap-1.5 rounded-[16px] border border-border bg-card p-5 shadow-card">
					<span className="text-sm text-[#616161]">Đang quá hạn</span>
					<span
						className={`text-3xl font-bold leading-none tracking-tight ${
							overdueCount > 0 ? "text-[#c62828]" : "text-foreground"
						}`}
					>
						{overdueCount}
						<span className="ml-1.5 text-base font-medium text-[#9e9e9e]">
							{isReceivable ? "khách" : "nhà cung cấp"}
						</span>
					</span>
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
					placeholder={
						isReceivable
							? "Tìm tên khách, số điện thoại..."
							: "Tìm tên nhà cung cấp, số điện thoại..."
					}
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
				<EmptyState hasDebts={owing.length > 0} isReceivable={isReceivable} />
			) : (
				<>
					{/* Mobile — card list + tải dần */}
					<div className="flex flex-col gap-3 lg:hidden">
						{mobileRows.map((a) => (
							<DebtCard key={a.id} account={a} onCollect={setCollecting} />
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
								Đã hiển thị tất cả {filtered.length}{" "}
								{isReceivable ? "khách" : "nhà cung cấp"}
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
											{isReceivable ? "Khách hàng" : "Nhà cung cấp"}
										</th>
										<th className="min-w-[140px] whitespace-nowrap px-4 py-3 font-semibold">
											Số điện thoại
										</th>
										<th className="min-w-[150px] whitespace-nowrap px-4 py-3 font-semibold">
											Hạn thanh toán
										</th>
										<th className="min-w-[130px] whitespace-nowrap px-4 py-3 text-right font-semibold">
											Còn nợ
										</th>
										<th className="min-w-[120px] whitespace-nowrap px-4 py-3 font-semibold">
											Trạng thái
										</th>
										<th className="w-[130px] px-4 py-3" />
									</tr>
								</thead>
								<tbody>
									{pageRows.map((a) => (
										<DebtRow
											key={a.id}
											account={a}
											isReceivable={isReceivable}
											onCollect={() => setCollecting(a)}
										/>
									))}
								</tbody>
							</table>
						</div>

						<DataPagination
							page={safePage}
							pageCount={pageCount}
							total={filtered.length}
							pageSize={PAGE_SIZE}
							noun={isReceivable ? "khách" : "nhà cung cấp"}
							onPage={setPage}
						/>
					</div>
				</>
			)}

			<CollectPaymentSheet
				account={collecting}
				onClose={() => setCollecting(null)}
				onConfirm={handleConfirm}
			/>

			{/* Toast phản hồi tức thì (DESIGN.md §21) */}
			{toast ? (
				<div
					role="status"
					className="pointer-events-none fixed inset-x-0 bottom-[calc(92px+env(safe-area-inset-bottom,0px))] z-50 flex justify-center px-4 lg:bottom-6"
				>
					<span className="flex items-center gap-2 rounded-full bg-[#2e7d32] px-5 py-3 text-base font-semibold text-white shadow-[0_8px_30px_rgba(0,0,0,0.18)]">
						<HandCoins className="size-5" aria-hidden />
						{toast}
					</span>
				</div>
			) : null}
		</div>
	);
}

/** Một hàng bảng công nợ (desktop). */
function DebtRow({
	account,
	isReceivable,
	onCollect,
}: {
	account: DebtAccount;
	isReceivable: boolean;
	onCollect: () => void;
}) {
	const status = debtStatus(account);
	const tile = "#5cad45";
	const initials = account.name
		.split(" ")
		.slice(-2)
		.map((w) => w[0])
		.join("")
		.toUpperCase();

	return (
		<tr className="border-t border-border transition-colors hover:bg-accent">
			<td className="px-4 py-3">
				<Link
					href={`/cong-no/${account.id}`}
					className="flex items-center gap-3"
				>
					<span
						className="flex size-9 shrink-0 items-center justify-center rounded-[10px] text-sm font-bold text-white"
						style={{ backgroundColor: tile }}
					>
						{initials}
					</span>
					<span className="flex min-w-0 flex-col">
						<span className="truncate font-semibold text-foreground">
							{account.name}
						</span>
						<span className="text-sm text-[#9e9e9e]">{account.partyLabel}</span>
					</span>
				</Link>
			</td>
			<td className="whitespace-nowrap px-4 py-3 text-base text-[#616161]">
				<span className="flex items-center gap-1.5">
					<Phone className="size-4 text-[#9e9e9e]" aria-hidden />
					{account.phone}
				</span>
			</td>
			<td className="whitespace-nowrap px-4 py-3 text-base text-[#616161]">
				{debtDueText(account)}
			</td>
			<td
				className={`whitespace-nowrap px-4 py-3 text-right text-base font-bold ${debtAmountColor(account)}`}
			>
				{formatVND(debtOutstanding(account))}₫
			</td>
			<td className="px-4 py-3">
				<span
					className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-sm font-semibold ${debtStatusBadgeClass[status]}`}
				>
					{debtStatusLabel[status]}
				</span>
			</td>
			<td className="px-4 py-3 text-right">
				<button
					type="button"
					onClick={onCollect}
					className="inline-flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-primary px-4 text-sm font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#5cad45] active:bg-[#3f8530]"
				>
					<HandCoins className="size-4.5" aria-hidden />
					{isReceivable ? "Thu tiền" : "Trả tiền"}
				</button>
			</td>
		</tr>
	);
}

function EmptyState({
	hasDebts,
	isReceivable,
}: {
	hasDebts: boolean;
	isReceivable: boolean;
}) {
	return (
		<div className="flex flex-col items-center gap-4 rounded-[16px] border border-dashed border-border bg-card px-6 py-14 text-center">
			<span className="flex size-16 items-center justify-center rounded-full bg-[#e8f5e9]">
				<HandCoins className="size-8 text-[#2e7d32]" aria-hidden />
			</span>
			<div className="flex flex-col gap-1">
				<h2 className="text-lg font-semibold text-foreground">
					{hasDebts
						? "Không tìm thấy khoản nợ nào"
						: isReceivable
							? "Chưa có khách nào còn nợ"
							: "Không nợ nhà cung cấp nào"}
				</h2>
				<p className="text-base text-[#616161]">
					{hasDebts
						? "Thử đổi từ khóa hoặc bỏ bớt bộ lọc."
						: isReceivable
							? "Ghi nợ khi bán chịu để theo dõi tại đây."
							: "Nhập hàng ghi nợ sẽ hiện công nợ tại đây."}
				</p>
			</div>
		</div>
	);
}
