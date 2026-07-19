import { Skeleton } from "@/components/ui/skeleton";

/**
 * Khung tải danh sách — responsive (DESIGN.md §12), dùng chung cho mọi list.
 * `< lg`: thẻ card (khớp *-card.tsx). `≥ lg`: bảng (khớp bảng trong *-list.tsx).
 * withToolbar: dựng header (tiêu đề + tìm kiếm + segmented filter) giả.
 */
export function ListSkeleton({
	rows = 6,
	withToolbar = true,
}: {
	rows?: number;
	withToolbar?: boolean;
}) {
	return (
		<div className="flex w-full flex-col gap-5">
			{withToolbar ? (
				<>
					{/* Page header */}
					<div className="flex flex-col gap-2">
						<Skeleton className="h-8 w-40" />
						<Skeleton className="h-5 w-64" />
					</div>
					{/* Tìm kiếm */}
					<Skeleton className="h-12 w-full md:h-11" />
					{/* Segmented filter */}
					<div className="grid grid-cols-4 gap-1 rounded-[12px] bg-[#f0f2f1] p-1">
						{Array.from({ length: 4 }).map((_, i) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: khung tĩnh, không đổi thứ tự
							<Skeleton key={`seg-${i}`} className="h-9 rounded-[9px]" />
						))}
					</div>
				</>
			) : null}

			{/* Mobile — card list */}
			<div className="flex flex-col gap-3 lg:hidden">
				{Array.from({ length: rows }).map((_, i) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: khung tĩnh, không đổi thứ tự
						key={`card-${i}`}
						className="flex items-start gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card"
					>
						<Skeleton className="size-12 shrink-0 rounded-[12px]" />
						<div className="flex min-w-0 flex-1 flex-col gap-2">
							<div className="flex items-start justify-between gap-2">
								<Skeleton className="h-5 w-3/5" />
								<Skeleton className="h-5 w-16 shrink-0 rounded-full" />
							</div>
							<Skeleton className="h-4 w-2/5" />
							<div className="mt-1 flex items-end justify-between gap-2">
								<Skeleton className="h-4 w-24" />
								<Skeleton className="h-6 w-20" />
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Desktop — bảng */}
			<div className="hidden lg:block">
				<div className="overflow-hidden rounded-[16px] border border-border bg-card shadow-card">
					{/* Header bảng */}
					<div className="flex items-center gap-4 bg-[#f5f5f5] px-4 py-3">
						<Skeleton className="h-4 w-40" />
						<Skeleton className="ml-auto h-4 w-20" />
						<Skeleton className="h-4 w-20" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-6" />
					</div>
					{/* Hàng */}
					{Array.from({ length: rows }).map((_, i) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: khung tĩnh, không đổi thứ tự
							key={`row-${i}`}
							className="flex items-center gap-4 border-t border-border px-4 py-4"
						>
							<Skeleton className="size-10 shrink-0 rounded-[10px]" />
							<div className="flex min-w-0 flex-1 flex-col gap-1.5">
								<Skeleton className="h-4 w-1/2" />
								<Skeleton className="h-3 w-1/4" />
							</div>
							<Skeleton className="h-5 w-20" />
							<Skeleton className="h-5 w-16" />
							<Skeleton className="h-6 w-20 rounded-full" />
							<Skeleton className="size-6 shrink-0" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
