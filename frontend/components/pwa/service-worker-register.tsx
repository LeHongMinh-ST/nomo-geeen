"use client";

import { useEffect } from "react";

/**
 * Đăng ký service worker cho PWA (DESIGN.md §26).
 *
 * Chỉ chạy ở production (dev để HMR tự do, tránh SW cache chunk gây lỗi hydrate).
 * Tự động nạp bản SW mới ngay khi phát hiện (skipWaiting) và reload MỘT lần để
 * mọi tab dùng cùng phiên bản — tránh tình trạng nút bấm chết do JS cũ/mới lệch.
 */
export function ServiceWorkerRegister() {
	useEffect(() => {
		if (process.env.NODE_ENV !== "production") return;
		if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
			return;
		}

		let refreshing = false;
		const onControllerChange = () => {
			if (refreshing) return;
			refreshing = true;
			window.location.reload();
		};
		navigator.serviceWorker.addEventListener(
			"controllerchange",
			onControllerChange,
		);

		const onLoad = () => {
			navigator.serviceWorker
				.register("/sw.js")
				.then((reg) => {
					// Nếu có bản SW đang chờ, yêu cầu kích hoạt ngay.
					if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
					reg.addEventListener("updatefound", () => {
						const sw = reg.installing;
						if (!sw) return;
						sw.addEventListener("statechange", () => {
							if (
								sw.state === "installed" &&
								navigator.serviceWorker.controller
							) {
								sw.postMessage("SKIP_WAITING");
							}
						});
					});
				})
				.catch(() => {
					// Bỏ qua lỗi đăng ký — app vẫn chạy bình thường không có SW.
				});
		};
		window.addEventListener("load", onLoad);

		return () => {
			window.removeEventListener("load", onLoad);
			navigator.serviceWorker.removeEventListener(
				"controllerchange",
				onControllerChange,
			);
		};
	}, []);

	return null;
}
