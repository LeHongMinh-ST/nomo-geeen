"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Splash logo khi mở PWA (DESIGN.md §26) — cảm giác native lúc khởi động.
 *
 * Chỉ hiện khi chạy standalone (mở từ màn hình chính), KHÔNG hiện trên tab
 * trình duyệt thường. Guard sessionStorage để reload trong phiên không nhấp
 * nháy lại. Overlay nền brand + logo fade/scale, tự tan sau ~800ms.
 */

const SPLASH_SEEN_KEY = "nomo-splash-shown";

function isStandalone() {
	if (typeof window === "undefined") return false;
	return (
		window.matchMedia?.("(display-mode: standalone)").matches ||
		// iOS Safari
		(window.navigator as unknown as { standalone?: boolean }).standalone ===
			true
	);
}

export function PwaSplash() {
	// null = chưa quyết định (tránh nhấp nháy trước khi kiểm tra môi trường)
	const [phase, setPhase] = useState<"hidden" | "visible" | "leaving">(
		"hidden",
	);

	useEffect(() => {
		if (!isStandalone()) return;
		if (sessionStorage.getItem(SPLASH_SEEN_KEY)) return;
		sessionStorage.setItem(SPLASH_SEEN_KEY, "1");

		setPhase("visible");
		const leave = setTimeout(() => setPhase("leaving"), 800);
		const done = setTimeout(() => setPhase("hidden"), 1050); // 800 + 250 fade-out
		return () => {
			clearTimeout(leave);
			clearTimeout(done);
		};
	}, []);

	if (phase === "hidden") return null;

	return (
		<div
			aria-hidden
			className={`fixed inset-0 z-[100] flex items-center justify-center bg-primary transition-opacity duration-[250ms] ease-out ${
				phase === "leaving" ? "opacity-0" : "opacity-100"
			}`}
		>
			<Image
				src="/images/logo2.png"
				alt=""
				width={160}
				height={160}
				priority
				className="size-40 animate-[splash-pop_600ms_ease-out] object-contain drop-shadow-[0_8px_24px_rgba(0,0,0,0.25)] motion-reduce:animate-none"
			/>
		</div>
	);
}
