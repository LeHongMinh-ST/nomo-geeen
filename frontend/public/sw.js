/* Conservative PWA cache: immutable Next assets plus public GET fallbacks only. */
const VERSION = "nomo-v4";
const ASSETS = [VERSION, "assets"].join("-");
const RUNTIME = [VERSION, "runtime"].join("-");
const NETWORK_TIMEOUT_MS = 3000;
const PUBLIC_NAVIGATION_PATHS = new Set([
	"/dang-nhap",
	"/dang-ky",
	"/home-page",
]);

self.addEventListener("install", (event) => {
	event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
	event.waitUntil(
		(async () => {
			const keys = await caches.keys();
			await Promise.all(
				keys
					.filter((key) => !key.startsWith(VERSION))
					.map((key) => caches.delete(key)),
			);
			await self.clients.claim();
		})(),
	);
});
self.addEventListener("message", (event) => {
	if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isHashedNextAsset(pathname) {
	return pathname.startsWith("/_next/static/");
}
function hasPersonalCredentials(request) {
	return (
		request.credentials === "include" ||
		request.headers.has("Authorization") ||
		request.headers.has("Cookie")
	);
}
function isPersonalizedApiPath(url) {
	return (
		/^(?:\/api\/|\/tenant(?:\/|$)|\/admin(?:\/|$)|\/auth(?:\/|$))/.test(
			url.pathname,
		) || /(?:tenant|user|customer|account|session|token)=/i.test(url.search)
	);
}
function isSafeDataGet(request, url) {
	if (hasPersonalCredentials(request) || isPersonalizedApiPath(url))
		return false;
	if (url.pathname !== "/manifest.webmanifest") return false;
	return !/(?:auth|checkout|payment|inventory|sale|order|purchase|stock|debt)/i.test(
		url.pathname,
	);
}
function isPublicNavigation(url) {
	return PUBLIC_NAVIGATION_PATHS.has(url.pathname);
}
function fetchWithTimeout(request) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), NETWORK_TIMEOUT_MS);
	return fetch(request, { signal: controller.signal }).finally(() =>
		clearTimeout(timer),
	);
}
async function networkFirst(request, fallback, shouldCache) {
	try {
		const response = await fetchWithTimeout(request);
		if (response.ok && shouldCache)
			await (await caches.open(RUNTIME)).put(request, response.clone());
		return response;
	} catch {
		return (
			(await caches.match(request)) ||
			(fallback ? await caches.match(fallback) : Response.error())
		);
	}
}

self.addEventListener("fetch", (event) => {
	const { request } = event;
	if (request.method !== "GET") return;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;
	if (isHashedNextAsset(url.pathname)) {
		event.respondWith(
			(async () => {
				const cached = await caches.match(request);
				if (cached) return cached;
				const response = await fetch(request);
				if (response.ok)
					await (await caches.open(ASSETS)).put(request, response.clone());
				return response;
			})(),
		);
		return;
	}
	if (request.mode === "navigate") {
		const isPublic =
			isPublicNavigation(url) && !hasPersonalCredentials(request);
		event.respondWith(
			networkFirst(request, isPublic ? "/home-page" : undefined, isPublic),
		);
		return;
	}
	if (isSafeDataGet(request, url))
		event.respondWith(networkFirst(request, undefined, true));
});
