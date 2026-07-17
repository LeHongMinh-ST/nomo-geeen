"use client";

import { BookOpen, Leaf, Pill, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DataPagination } from "@/components/app/shared/data-pagination";
import { LoadMoreSentinel } from "@/components/app/shared/load-more-sentinel";
import {
	availableSuggestionCount,
	type Disease,
	fieldBadgeClass,
	fieldLabel,
	type HandbookField,
	handbookDiseases,
	typeBadgeClass,
	typeLabel,
} from "@/lib/handbook";
import { DiseaseCard } from "./disease-card";

/**
 * Danh sách Sổ tay — responsive (DESIGN.md §12).
 * Segmented lọc lĩnh vực (Tất cả / Trồng trọt / Chăn nuôi / Thủy sản) + tìm kiếm.
 * Mobile: card list + tải dần. Desktop (lg+): bảng đầy đủ + phân trang.
 */

type FieldFilter = "all" | HandbookField;

const fieldFilters: { value: FieldFilter; label: string }[] = [
	{ value: "all", label: "Tất cả" },
	{ value: "cultivation", label: "Trồng trọt" },
	{ value: "livestock", label: "Chăn nuôi" },
	{ value: "aquaculture", label: "Thủy sản" },
];

const PAGE_SIZE = 10;
const MOBILE_BATCH = 8;

export function HandbookList() {
	const [query, setQuery] = useState("");
	const [field, setField] = useState<FieldFilter>("all");
	const [page, setPage] = useState(1);
	const [mobileCount, setMobileCount] = useState(MOBILE_BATCH);

	const filtered = useMemo(() => {
		const q = query.trim().toLowerCase();
		return handbookDiseases.filter((d) => {
			if (field !== "all" && d.field !== field) return false;
			if (!q) return true;
			return (
				d.name.toLowerCase().includes(q) ||
				d.subject.toLowerCase().includes(q) ||
				d.aliases.some((a) => a.toLowerCase().includes(q))
			);
		});
	}, [query, field]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reset khi tiêu chí lọc đổi
	useEffect(() => {
		setPage(1);
		setMobileCount(MOBILE_BATCH);
	}, [query, field]);

	const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const safePage = Math.min(page, pageCount);
	const pageRows = filtered.slice(
		(safePage - 1) * PAGE_SIZE,
		safePage * PAGE_SIZE,
	);
	const mobileRows = filtered.slice(0, mobileCount);
	const mobileHasMore = mobileCount < filtered.length;

	return (
		<div className="flex w-full flex-col gap-5">
			{/* Page header */}
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<h1 className="text-2xl font-bold tracking-tight text-foreground">
							Sổ tay
						</h1>
						<span className="rounded-full bg-[#e3f2fd] px-2.5 py-0.5 text-sm font-semibold text-[#1565c0]">
							{handbookDiseases.length}
						</span>
					</div>
					<p className="text-base text-[#616161]">
						Tra bệnh theo cây trồng, vật nuôi, thủy sản — gợi ý thuốc đang có.
					</p>
				</div>

				{/* Hành động — desktop */}
				<Link
					href="/so-tay/them"
					className="hidden h-11 items-center gap-2 rounded-full bg-primary px-5 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#43a047] active:bg-[#2e7d32] lg:flex"
				>
					<Plus className="size-5" aria-hidden />
					Thêm sổ tay
				</Link>
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
					placeholder="Tìm tên bệnh, đối tượng, từ khóa..."
					className="h-12 w-full rounded-[10px] border border-border bg-white pl-11 pr-4 text-base text-foreground placeholder:text-[#9e9e9e] transition-colors duration-200 ease-out focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 md:h-11"
				/>
			</div>

			{/* Lọc lĩnh vực — segmented control chia đều, không cắt mép */}
			<div className="grid grid-cols-4 gap-1 rounded-[12px] bg-[#f0f2f1] p-1">
				{fieldFilters.map((f) => (
					<button
						key={f.value}
						type="button"
						onClick={() => setField(f.value)}
						className={`h-9 rounded-[9px] px-1 text-sm font-semibold transition-colors duration-200 ease-out ${
							field === f.value
								? "bg-card text-primary shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
								: "text-[#616161] hover:text-foreground"
						}`}
					>
						{f.label}
					</button>
				))}
			</div>

			{/* Kết quả */}
			{filtered.length === 0 ? (
				<EmptyState hasEntries={handbookDiseases.length > 0} />
			) : (
				<>
					{/* Mobile — card list + tải dần */}
					<div className="flex flex-col gap-3 lg:hidden">
						{mobileRows.map((d) => (
							<DiseaseCard key={d.id} disease={d} />
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
								Đã hiển thị tất cả {filtered.length} mục
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
											Tên bệnh / vấn đề
										</th>
										<th className="min-w-[130px] whitespace-nowrap px-4 py-3 font-semibold">
											Lĩnh vực
										</th>
										<th className="min-w-[140px] whitespace-nowrap px-4 py-3 font-semibold">
											Đối tượng
										</th>
										<th className="min-w-[110px] whitespace-nowrap px-4 py-3 font-semibold">
											Loại
										</th>
										<th className="min-w-[150px] whitespace-nowrap px-4 py-3 text-right font-semibold">
											Thuốc gợi ý
										</th>
									</tr>
								</thead>
								<tbody>
									{pageRows.map((d) => (
										<DiseaseRow key={d.id} disease={d} />
									))}
								</tbody>
							</table>
						</div>

						<DataPagination
							page={safePage}
							pageCount={pageCount}
							total={filtered.length}
							pageSize={PAGE_SIZE}
							noun="mục"
							onPage={setPage}
						/>
					</div>
				</>
			)}

			{/* FAB Thêm sổ tay — mobile/tablet (desktop đã có nút ở header) */}
			<Link
				href="/so-tay/them"
				aria-label="Thêm sổ tay"
				className="fixed bottom-fab-safe right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-primary pl-4 pr-5 text-base font-semibold text-white shadow-[0_8px_20px_rgba(76,175,80,0.4)] transition-colors duration-200 ease-out active:bg-[#2e7d32] lg:hidden"
			>
				<Plus className="size-6" aria-hidden />
				Thêm
			</Link>
		</div>
	);
}

/** Một hàng bảng Sổ tay (desktop). */
function DiseaseRow({ disease }: { disease: Disease }) {
	const available = availableSuggestionCount(disease);

	return (
		<tr className="border-t border-border transition-colors hover:bg-accent">
			<td className="px-4 py-3">
				<Link
					href={`/so-tay/${disease.id}`}
					className="flex items-center gap-3"
				>
					<span
						className="flex size-9 shrink-0 items-center justify-center rounded-[10px]"
						style={{ backgroundColor: "#6d4c41" }}
					>
						<Leaf className="size-5 text-white" aria-hidden />
					</span>
					<span className="flex min-w-0 flex-col">
						<span className="truncate font-semibold text-foreground">
							{disease.name}
						</span>
						<span className="truncate text-sm text-[#9e9e9e]">
							{disease.symptom}
						</span>
					</span>
				</Link>
			</td>
			<td className="whitespace-nowrap px-4 py-3">
				<span
					className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${fieldBadgeClass[disease.field]}`}
				>
					{fieldLabel[disease.field]}
				</span>
			</td>
			<td className="whitespace-nowrap px-4 py-3 text-base text-[#616161]">
				{disease.subject}
			</td>
			<td className="whitespace-nowrap px-4 py-3">
				<span
					className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${typeBadgeClass[disease.type]}`}
				>
					{typeLabel[disease.type]}
				</span>
			</td>
			<td className="whitespace-nowrap px-4 py-3 text-right">
				<span
					className={`inline-flex items-center gap-1.5 text-base font-semibold ${
						available > 0 ? "text-[#2e7d32]" : "text-[#9e9e9e]"
					}`}
				>
					<Pill className="size-4.5" aria-hidden />
					{available > 0 ? `${available} còn hàng` : "—"}
				</span>
			</td>
		</tr>
	);
}

function EmptyState({ hasEntries }: { hasEntries: boolean }) {
	return (
		<div className="flex flex-col items-center gap-4 rounded-[16px] border border-dashed border-border bg-card px-6 py-14 text-center">
			<span className="flex size-16 items-center justify-center rounded-full bg-[#efebe9]">
				<BookOpen className="size-8 text-[#6d4c41]" aria-hidden />
			</span>
			<div className="flex flex-col gap-1">
				<h2 className="text-lg font-semibold text-foreground">
					{hasEntries ? "Không tìm thấy mục nào" : "Sổ tay còn trống"}
				</h2>
				<p className="text-base text-[#616161]">
					{hasEntries
						? "Thử đổi từ khóa hoặc bỏ bớt bộ lọc."
						: "Thêm bệnh và thuốc gợi ý để tra nhanh khi bán hàng."}
				</p>
			</div>
			{!hasEntries ? (
				<Link
					href="/so-tay/them"
					className="flex h-12 items-center gap-2 rounded-[10px] bg-primary px-6 text-base font-semibold text-white transition-colors duration-200 ease-out hover:bg-[#43a047] active:bg-[#2e7d32]"
				>
					<Plus className="size-5" aria-hidden />
					Thêm sổ tay
				</Link>
			) : null}
		</div>
	);
}
