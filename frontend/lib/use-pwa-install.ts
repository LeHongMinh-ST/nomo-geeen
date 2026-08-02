"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Quản lý trạng thái cài đặt PWA trên trang đăng nhập
 * (plans/pwa-install-login-mobile.md, DESIGN.md §26).
 *
 * - isMobile: viewport mobile (max-width 1023px), không dựa vào user-agent/pointer.
 * - isStandalone: display-mode: standalone + fallback navigator.standalone (iOS).
 * - beforeinstallprompt: event deferred trên Android/Chromium → install() mở prompt native.
 * - appinstalled: ẩn CTA ngay sau khi cài xong, không cần refresh.
 * - iOS Safari: không có beforeinstallprompt → hiển thị hướng dẫn thủ công.
 */

type BeforeInstallPromptEvent = Event & {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const MOBILE_MEDIA = "(max-width: 1023px)";

function detectStandalone() {
	if (typeof window === "undefined") return false;
	return (
		window.matchMedia?.("(display-mode: standalone)").matches ||
		Boolean(
			(window.navigator as Navigator & { standalone?: boolean }).standalone,
		)
	);
}

function detectIosSafari() {
	if (typeof window === "undefined") return false;
	const ua = navigator.userAgent;
	const isIos =
		/ipad|iphone|ipod/i.test(ua) ||
		(/Macintosh|MacIntel/i.test(ua) && navigator.maxTouchPoints > 1);
	return isIos && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
}

export function usePwaInstall() {
	const [mounted, setMounted] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	// Standalone detection tĩnh tại mount: không đổi trong phiên, không cần setter.
	const [isStandalone] = useState(detectStandalone);
	const [deferredPrompt, setDeferredPrompt] =
		useState<BeforeInstallPromptEvent | null>(null);
	const [installed, setInstalled] = useState(false);
	const [dismissed, setDismissed] = useState(false);
	const [prompting, setPrompting] = useState(false);

	useEffect(() => {
		setMounted(true);

		const mql = window.matchMedia?.(MOBILE_MEDIA);
		const updateMobile = () => setIsMobile(mql?.matches ?? false);
		updateMobile();
		mql?.addEventListener("change", updateMobile);

		const onBeforeInstallPrompt = (event: Event) => {
			event.preventDefault();
			setDeferredPrompt(event as BeforeInstallPromptEvent);
		};
		const onAppInstalled = () => setInstalled(true);

		window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
		window.addEventListener("appinstalled", onAppInstalled);

		return () => {
			mql?.removeEventListener("change", updateMobile);
			window.removeEventListener(
				"beforeinstallprompt",
				onBeforeInstallPrompt,
			);
			window.removeEventListener("appinstalled", onAppInstalled);
		};
	}, []);

	const isIosSafari = useMemo(() => detectIosSafari(), []);

	const install = useCallback(async () => {
		const event = deferredPrompt;
		if (!event) return;
		setPrompting(true);
		try {
			await event.prompt();
			const choice = await event.userChoice;
			if (choice.outcome === "accepted") setInstalled(true);
			else setDismissed(true);
		} finally {
			setDeferredPrompt(null);
			setPrompting(false);
		}
	}, [deferredPrompt]);

	const dismiss = useCallback(() => setDismissed(true), []);

	const canUseNativePrompt = deferredPrompt !== null;
	const canShow =
		mounted &&
		isMobile &&
		!isStandalone &&
		!installed &&
		!dismissed;

	return {
		canShow,
		canUseNativePrompt,
		isIosSafari,
		install,
		dismiss,
		prompting,
	};
}
