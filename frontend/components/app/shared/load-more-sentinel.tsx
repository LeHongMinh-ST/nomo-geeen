"use client";

import { useEffect, useRef } from "react";

/**
 * Sentinel quan sát bằng IntersectionObserver để tải thêm khi cuộn tới đáy
 * (DESIGN.md §12.3 — infinite scroll trên mobile). Dùng chung cho các danh sách.
 */
export function LoadMoreSentinel({ onReach }: { onReach: () => void }) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0]?.isIntersecting) onReach();
			},
			{ rootMargin: "200px" },
		);
		observer.observe(el);
		return () => observer.disconnect();
	}, [onReach]);

	return (
		<div ref={ref} className="flex justify-center py-3">
			<span className="size-6 animate-spin rounded-full border-2 border-[#e0e0e0] border-t-primary" />
		</div>
	);
}
