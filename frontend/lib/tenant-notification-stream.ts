/**
 * Tenant notification SSE client.
 *
 * Auth tradeoff:
 * - Access token is Bearer-only (in-memory). EventSource cannot set Authorization.
 * - Token-in-query is rejected (proxy/access logs leak).
 * - Chosen: fetch() streaming with Authorization header (same as userFetch).
 * - List + unread-count remain source of truth; stream only hints to re-fetch.
 */

export type NotificationStreamEvent =
	| { type: "connected"; at: string }
	| { type: "heartbeat"; at: string }
	| {
			type: "notification.changed";
			action: "created" | "updated";
			notificationId: string;
			audience: "USER" | "TENANT";
			at: string;
	  };

export type NotificationStreamHandlers = {
	onEvent: (event: NotificationStreamEvent) => void;
	onError?: (error: unknown) => void;
	onOpen?: () => void;
};

export type NotificationStreamOptions = {
	accessToken: string;
	apiBase?: string;
	/** Injected for tests. */
	fetchImpl?: typeof fetch;
	/** Backoff base ms (default 1500). */
	retryBaseMs?: number;
	/** Max backoff ms (default 30_000). */
	retryMaxMs?: number;
	/** Optional clock for tests. */
	now?: () => number;
	/** Optional sleep for tests. */
	sleep?: (ms: number) => Promise<void>;
};

export type NotificationStreamHandle = {
	/** Abort active request and stop reconnect loop. */
	close: () => void;
};

const DEFAULT_API_BASE =
	process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

/**
 * Parse one SSE block (`\n\n` delimited). Supports multi-line `data:` JSON.
 */
export function parseSseBlock(block: string): NotificationStreamEvent | null {
	const lines = block.split(/\r?\n/);
	const dataLines: string[] = [];
	let eventType: string | null = null;
	for (const line of lines) {
		if (!line || line.startsWith(":")) continue;
		if (line.startsWith("event:")) {
			eventType = line.slice(6).trim();
			continue;
		}
		if (line.startsWith("data:")) {
			dataLines.push(line.slice(5).trimStart());
		}
	}
	if (dataLines.length === 0) {
		if (eventType === "heartbeat") {
			return { type: "heartbeat", at: new Date().toISOString() };
		}
		return null;
	}
	const raw = dataLines.join("\n");
	try {
		const parsed = JSON.parse(raw) as NotificationStreamEvent;
		if (!parsed || typeof parsed !== "object" || !("type" in parsed)) {
			return null;
		}
		return parsed;
	} catch {
		return null;
	}
}

/**
 * Incremental SSE buffer parser — feeds complete blocks to onEvent.
 * Returns leftover incomplete tail.
 */
export function consumeSseBuffer(
	buffer: string,
	onEvent: (event: NotificationStreamEvent) => void,
): string {
	const parts = buffer.split(/\r?\n\r?\n/);
	const complete = parts.slice(0, -1);
	const rest = parts[parts.length - 1] ?? "";
	for (const block of complete) {
		const event = parseSseBlock(block);
		if (event) onEvent(event);
	}
	return rest;
}

function defaultSleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Long-lived SSE subscription with Authorization Bearer + auto-reconnect.
 * Caller must close() on unmount. Not a backlog — re-fetch list/unread after open/reconnect.
 */
export function subscribeTenantNotificationStream(
	options: NotificationStreamOptions,
	handlers: NotificationStreamHandlers,
): NotificationStreamHandle {
	const apiBase = options.apiBase ?? DEFAULT_API_BASE;
	const fetchImpl = options.fetchImpl ?? fetch;
	const retryBaseMs = options.retryBaseMs ?? 1_500;
	const retryMaxMs = options.retryMaxMs ?? 30_000;
	const sleep = options.sleep ?? defaultSleep;

	let closed = false;
	let attempt = 0;
	let abort: AbortController | null = null;

	const close = () => {
		closed = true;
		abort?.abort();
		abort = null;
	};

	const run = async () => {
		while (!closed) {
			abort = new AbortController();
			try {
				const response = await fetchImpl(
					`${apiBase}/tenant/notifications/stream`,
					{
						method: "GET",
						headers: {
							Accept: "text/event-stream",
							Authorization: `Bearer ${options.accessToken}`,
						},
						credentials: "include",
						signal: abort.signal,
					},
				);
				if (!response.ok || !response.body) {
					throw new Error(`SSE HTTP ${response.status}`);
				}
				attempt = 0;
				handlers.onOpen?.();

				const reader = response.body.getReader();
				const decoder = new TextDecoder();
				let buffer = "";
				while (!closed) {
					const { done, value } = await reader.read();
					if (done) break;
					buffer += decoder.decode(value, { stream: true });
					buffer = consumeSseBuffer(buffer, handlers.onEvent);
				}
			} catch (error) {
				if (closed) return;
				// AbortError on intentional close — ignore.
				if (
					error &&
					typeof error === "object" &&
					"name" in error &&
					(error as { name?: string }).name === "AbortError"
				) {
					return;
				}
				handlers.onError?.(error);
			}

			if (closed) return;
			const delay = Math.min(
				retryMaxMs,
				retryBaseMs * 2 ** Math.min(attempt, 5),
			);
			attempt += 1;
			await sleep(delay);
		}
	};

	void run();
	return { close };
}
