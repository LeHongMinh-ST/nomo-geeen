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
		const recoveryKey = "nomo-runtime-cache-recovery";
		const shouldRecover = (value: unknown) => {
			const message =
				value instanceof Error ? value.message : String(value ?? "");
			return /module factory is not available|ChunkLoadError|Loading chunk|dynamically imported module/i.test(
				message,
			);
		};
		const recoverFromStaleRuntime = (value: unknown) => {
			if (!shouldRecover(value)) return;
			const lastRecovery = Number(sessionStorage.getItem(recoveryKey) ?? 0);
			if (Date.now() - lastRecovery < 15_000) return;
			sessionStorage.setItem(recoveryKey, String(Date.now()));
			void Promise.all([
				navigator.serviceWorker
					.getRegistrations()
					.then((registrations) =>
						Promise.all(registrations.map((registration) => registration.unregister())),
					),
				caches
					.keys()
					.then((keys) => Promise.all(keys.map((key) => caches.delete(key)))),
			]).finally(() => window.location.reload());
		};
		const onWindowError = (event: ErrorEvent) =>
			recoverFromStaleRuntime(event.error ?? event.message);
		const onUnhandledRejection = (event: PromiseRejectionEvent) =>
			recoverFromStaleRuntime(event.reason);
		window.addEventListener("error", onWindowError, true);
		window.addEventListener("unhandledrejection", onUnhandledRejection);
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
					.register("/sw.js", { updateViaCache: "none" })
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
			window.removeEventListener("error", onWindowError, true);
			window.removeEventListener(
				"unhandledrejection",
				onUnhandledRejection,
			);
			navigator.serviceWorker.removeEventListener(
				"controllerchange",
				onControllerChange,
			);
		};
	}, []);

	return null;
}
