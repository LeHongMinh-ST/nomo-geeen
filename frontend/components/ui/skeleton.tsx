/**
 * Skeleton — viên gạch nền cho trạng thái đang tải (DESIGN.md §21).
 * Thuần trình bày, không state. Ghép nhiều Skeleton để dựng khung nội dung giả.
 */
export function Skeleton({ className = "" }: { className?: string }) {
	return (
		<div
			className={`animate-pulse rounded-[10px] bg-[#eeeeee] motion-reduce:animate-none ${className}`}
			aria-hidden
		/>
	);
}
