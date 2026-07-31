"use client";

import { RotateCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const REFRESH_DISTANCE = 72;

function isMobileStandalonePwa() {
	const standalone =
		window.matchMedia("(display-mode: standalone)").matches ||
		("standalone" in navigator &&
			Boolean((navigator as Navigator & { standalone?: boolean }).standalone));

	return (
		standalone &&
		window.matchMedia("(pointer: coarse)").matches &&
		window.matchMedia("(max-width: 1023px)").matches
	);
}

function shouldIgnore(target: EventTarget | null) {
	if (!(target instanceof Element)) return true;
	if (
		target.closest(
			"[data-pull-refresh-ignore], input, textarea, select, button, [contenteditable='true']",
		)
	) {
		return true;
	}

	// Vùng cuộn chính của app đang ở đỉnh mới cho phép kéo; mọi vùng cuộn lồng
	// bên trong (sheet, danh sách ngang) tự xử lý cuộn của nó.
	let element: Element | null = target;
	while (element) {
		if (element.hasAttribute("data-app-scroll")) return element.scrollTop > 0;
		const style = window.getComputedStyle(element);
		if (
			(style.overflowY === "auto" || style.overflowY === "scroll") &&
			element.scrollHeight > element.clientHeight
		) {
			return true;
		}
		element = element.parentElement;
	}

	return false;
}

export function PullToRefresh({ children }: { children: React.ReactNode }) {
	const [enabled, setEnabled] = useState(false);
	const [distance, setDistance] = useState(0);
	const [refreshing, setRefreshing] = useState(false);
	const startY = useRef<number | null>(null);
	const distanceRef = useRef(0);

	useEffect(() => {
		const updateEnabled = () => setEnabled(isMobileStandalonePwa());
		updateEnabled();
		window.addEventListener("resize", updateEnabled);
		return () => window.removeEventListener("resize", updateEnabled);
	}, []);

	useEffect(() => {
		if (!enabled) return;

		const reset = () => {
			startY.current = null;
			distanceRef.current = 0;
			setDistance(0);
		};

		const onTouchStart = (event: TouchEvent) => {
			if (refreshing || shouldIgnore(event.target)) return;
			startY.current = event.touches[0]?.clientY ?? null;
		};

		const onTouchMove = (event: TouchEvent) => {
			if (startY.current === null || refreshing) return;
			const currentY = event.touches[0]?.clientY ?? startY.current;
			const nextDistance = Math.max(
				0,
				Math.min(currentY - startY.current, REFRESH_DISTANCE + 24),
			);
			if (nextDistance <= 0) return reset();
			event.preventDefault();
			distanceRef.current = nextDistance;
			setDistance(nextDistance);
		};

		const onTouchEnd = () => {
			if (startY.current === null) return;
			const shouldRefresh = distanceRef.current >= REFRESH_DISTANCE;
			reset();
			if (shouldRefresh) {
				setRefreshing(true);
				window.location.reload();
			}
		};

		document.addEventListener("touchstart", onTouchStart, { passive: true });
		document.addEventListener("touchmove", onTouchMove, { passive: false });
		document.addEventListener("touchend", onTouchEnd, { passive: true });
		document.addEventListener("touchcancel", reset, { passive: true });
		return () => {
			document.removeEventListener("touchstart", onTouchStart);
			document.removeEventListener("touchmove", onTouchMove);
			document.removeEventListener("touchend", onTouchEnd);
			document.removeEventListener("touchcancel", reset);
		};
	}, [enabled, refreshing]);

	return (
		<>
			{children}
			{enabled && distance > 0 ? (
				<div className="pointer-events-none fixed left-1/2 top-3 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-card px-3 py-2 text-xs font-medium text-muted-foreground shadow-md">
					<RotateCw
						className={`size-4 ${distance >= REFRESH_DISTANCE ? "text-primary" : ""}`}
						aria-hidden
					/>
					{distance >= REFRESH_DISTANCE
						? "Thả để tải lại"
						: "Kéo xuống để tải lại"}
				</div>
			) : null}
		</>
	);
}
