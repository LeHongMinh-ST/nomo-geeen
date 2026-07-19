import { Skeleton } from "@/components/ui/skeleton";

/**
 * Khung tải Trang chủ — khớp app/(app)/page.tsx:
 * chào · KPI hero · 2 KPI phụ · cảnh báo · lối tắt · chart + bán chạy.
 */
export function DashboardSkeleton() {
	return (
		<div className="flex w-full flex-col gap-5 lg:gap-6">
			{/* Lời chào */}
			<div className="flex items-start justify-between gap-3">
				<div className="flex flex-col gap-2">
					<Skeleton className="h-4 w-40" />
					<Skeleton className="h-8 w-48" />
				</div>
				<Skeleton className="h-12 w-24 rounded-[10px]" />
			</div>

			{/* KPI hero */}
			<div className="flex flex-col gap-3 rounded-[18px] border border-border bg-[#f3f8f1] p-5">
				<div className="flex items-center justify-between">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-7 w-14 rounded-full" />
				</div>
				<Skeleton className="h-10 w-52" />
				<Skeleton className="h-4 w-40" />
			</div>

			{/* KPI phụ */}
			<section className="grid grid-cols-2 gap-3">
				{Array.from({ length: 2 }).map((_, i) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: khung tĩnh
						key={`kpi-sub-${i}`}
						className="flex flex-col gap-2 rounded-[16px] border border-border bg-card p-4 shadow-card"
					>
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-6 w-28" />
						<Skeleton className="h-4 w-16" />
					</div>
				))}
			</section>

			{/* Cảnh báo */}
			<section className="flex flex-col gap-3">
				<div className="flex items-center justify-between">
					<Skeleton className="h-5 w-24" />
					<Skeleton className="h-6 w-16 rounded-full" />
				</div>
				<div className="flex gap-3 overflow-hidden sm:grid sm:grid-cols-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: khung tĩnh
							key={`alert-${i}`}
							className="flex min-w-[72%] items-center gap-3 rounded-[16px] border border-border bg-card p-4 shadow-card sm:min-w-0"
						>
							<Skeleton className="size-12 shrink-0 rounded-[12px]" />
							<div className="flex flex-col gap-2">
								<Skeleton className="h-7 w-10" />
								<Skeleton className="h-4 w-24" />
							</div>
						</div>
					))}
				</div>
			</section>

			{/* Lối tắt */}
			<section className="flex flex-col gap-3">
				<Skeleton className="h-5 w-28" />
				<div className="grid grid-cols-3 gap-3">
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: khung tĩnh
							key={`shortcut-${i}`}
							className="flex min-h-[96px] flex-col items-center justify-center gap-2.5 rounded-[16px] border border-border bg-card p-3 shadow-card"
						>
							<Skeleton className="size-12 rounded-[12px]" />
							<Skeleton className="h-4 w-14" />
						</div>
					))}
				</div>
			</section>

			{/* Chart + Bán chạy */}
			<div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
				<section className="flex flex-col gap-4 rounded-[16px] border border-border bg-card p-5 shadow-card">
					<div className="flex items-center justify-between">
						<Skeleton className="h-5 w-36" />
						<Skeleton className="h-4 w-16" />
					</div>
					<Skeleton className="h-44 w-full rounded-[12px]" />
				</section>
				<section className="flex flex-col gap-3 rounded-[16px] border border-border bg-card p-5 shadow-card">
					<div className="flex items-center justify-between">
						<Skeleton className="h-5 w-40" />
						<Skeleton className="h-4 w-16" />
					</div>
					<ul className="flex flex-col">
						{Array.from({ length: 4 }).map((_, i) => (
							<li
								// biome-ignore lint/suspicious/noArrayIndexKey: khung tĩnh
								key={`best-${i}`}
								className="flex items-center gap-3 border-b border-border py-3.5 last:border-b-0"
							>
								<Skeleton className="size-8 shrink-0 rounded-full" />
								<div className="flex min-w-0 flex-1 flex-col gap-1.5">
									<Skeleton className="h-4 w-4/5" />
									<Skeleton className="h-3.5 w-20" />
								</div>
								<Skeleton className="h-5 w-20 shrink-0" />
							</li>
						))}
					</ul>
				</section>
			</div>
		</div>
	);
}
