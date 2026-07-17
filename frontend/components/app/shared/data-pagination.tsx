"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Phân trang bảng desktop (DESIGN.md §12.3). Dùng chung cho các danh sách.
 * Chỉ 1 trang → hiện tổng số bản ghi. `noun` là danh từ đối tượng (vd "đơn").
 */
export function DataPagination({
	page,
	pageCount,
	total,
	pageSize,
	noun,
	onPage,
}: {
	page: number;
	pageCount: number;
	total: number;
	pageSize: number;
	noun: string;
	onPage: (p: number) => void;
}) {
	if (pageCount <= 1) {
		return (
			<p className="px-1 text-sm text-[#616161]">
				Tổng {total} {noun}
			</p>
		);
	}

	const from = (page - 1) * pageSize + 1;
	const to = Math.min(page * pageSize, total);

	return (
		<div className="flex items-center justify-between px-1">
			<p className="text-sm text-[#616161]">
				Hiển thị {from}–{to} trên {total} {noun}
			</p>
			<div className="flex items-center gap-1">
				<button
					type="button"
					aria-label="Trang trước"
					onClick={() => onPage(page - 1)}
					disabled={page <= 1}
					className="flex size-9 items-center justify-center rounded-[8px] border border-border bg-card text-[#616161] transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-40"
				>
					<ChevronLeft className="size-5" aria-hidden />
				</button>
				{Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
					<button
						key={p}
						type="button"
						onClick={() => onPage(p)}
						className={`h-9 min-w-9 rounded-[8px] px-2 text-sm font-semibold transition-colors ${
							p === page
								? "bg-primary text-white"
								: "border border-border bg-card text-[#616161] hover:bg-[#f5f5f5]"
						}`}
					>
						{p}
					</button>
				))}
				<button
					type="button"
					aria-label="Trang sau"
					onClick={() => onPage(page + 1)}
					disabled={page >= pageCount}
					className="flex size-9 items-center justify-center rounded-[8px] border border-border bg-card text-[#616161] transition-colors hover:bg-[#f5f5f5] disabled:cursor-not-allowed disabled:opacity-40"
				>
					<ChevronRight className="size-5" aria-hidden />
				</button>
			</div>
		</div>
	);
}
