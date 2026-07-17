/*
 * Service worker NomoGreen (DESIGN.md §26 PWA).
 *
 * BÀI HỌC QUAN TRỌNG: KHÔNG cache-first cho JS/CSS/HTML.
 * Next.js chia mã thành nhiều chunk; nếu phục vụ chunk JS CŨ không khớp HTML mới,
 * React hydrate lỗi → toàn bộ nút/onClick/Link chết. Vì vậy:
 *   - HTML điều hướng + JS + CSS: NETWORK-FIRST (luôn lấy bản mới, cache chỉ để offline).
 *   - Ảnh / font / icon: cache-first (an toàn, ít đổi).
 *   - KHÔNG đụng API/POST.
 */

const VERSION = "nomo-v2";
const RUNTIME = `${VERSION}-runtime`;
const ASSETS = `${VERSION}-assets`;

self.addEventListener("install", (event) => {
	// Kích hoạt ngay bản mới, không chờ tab cũ đóng.
	event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			// Dọn mọi cache phiên bản cũ (kể cả nomo-v1 từng cache-first JS gây lỗi).
			const keys = await caches.keys();
			await Promise.all(
				keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)),
			);
			await self.clients.claim();
		})(),
	);
});

// Cho phép trang chủ động yêu cầu SW cập nhật ngay.
self.addEventListener("message", (event) => {
	if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isImageOrFont(pathname) {
	return /\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|ttf|woff2?|otf)$/.test(
		pathname,
	);
}

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;

	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;

	// Điều hướng trang (HTML) → network-first, fallback cache khi offline.
	if (request.mode === "navigate") {
		event.respondWith(
			(async () => {
				try {
					const res = await fetch(request);
					const cache = await caches.open(RUNTIME);
					cache.put(request, res.clone());
					return res;
				} catch {
					const cached = await caches.match(request);
					return cached || caches.match("/trang-chu");
				}
			})(),
		);
		return;
	}

	// Ảnh / font / icon → cache-first (an toàn, không phá hydrate).
	if (isImageOrFont(url.pathname)) {
		event.respondWith(
			(async () => {
				const cached = await caches.match(request);
				if (cached) return cached;
				try {
					const res = await fetch(request);
					const cache = await caches.open(ASSETS);
					cache.put(request, res.clone());
					return res;
				} catch {
					return cached || Response.error();
				}
			})(),
		);
		return;
	}

	// Mọi thứ còn lại (JS, CSS, JSON, manifest...) → network-first.
	// KHÔNG bao giờ phục vụ JS/CSS cũ: tránh lỗi hydrate làm chết nút bấm.
	event.respondWith(
		(async () => {
			try {
				const res = await fetch(request);
				const cache = await caches.open(RUNTIME);
				cache.put(request, res.clone());
				return res;
			} catch {
				const cached = await caches.match(request);
				return cached || Response.error();
			}
		})(),
	);
});
