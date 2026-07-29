"use client";

import { useEffect, useRef } from "react";

export type QuickSaleDraftStreamEvent =
	| { type: "connected"; at: string; draftId: string }
	| { type: "heartbeat"; at: string }
	| {
			type: "quick-sale-draft.changed";
			draftId: string;
			tenantId: string;
			actorUserId: string;
			action:
				| "created"
				| "line-added"
				| "line-quantity-set"
				| "line-removed"
				| "customer-set"
				| "expired"
				| "closed"
				| "checked-out";
			revision: number;
			at: string;
	  };

export type QuickSaleDraftStreamHandlers = {
	onEvent: (event: QuickSaleDraftStreamEvent) => void;
	onError?: (error: unknown) => void;
	onOpen?: () => void;
};

export type QuickSaleDraftStreamHandle = {
	close: () => void;
};

function parseBlock(block: string): QuickSaleDraftStreamEvent | null {
	const dataLines: string[] = [];
	for (const line of block.split(/\r?\n/)) {
		if (!line || line.startsWith(":")) continue;
		if (line.startsWith("data:")) dataLines.push(line.slice(5).trimStart());
	}
	if (dataLines.length === 0) return null;
	const raw = dataLines.join("\n");
	try {
		return JSON.parse(raw) as QuickSaleDraftStreamEvent;
	} catch {
		return null;
	}
}

function consumeBuffer(
	buffer: string,
	onEvent: (event: QuickSaleDraftStreamEvent) => void,
): string {
	const parts = buffer.split(/\r?\n\r?\n/);
	const complete = parts.slice(0, -1);
	const rest = parts[parts.length - 1] ?? "";
	for (const block of complete) {
		const event = parseBlock(block);
		if (event) onEvent(event);
	}
	return rest;
}

const DEFAULT_API_BASE =
	process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

export function subscribeQuickSaleDraftStream(
	apiBase: string,
	draftId: string,
	accessToken: string,
	handlers: QuickSaleDraftStreamHandlers,
): QuickSaleDraftStreamHandle {
	let closed = false;
	let attempt = 0;
	const retryBaseMs = 1_500;
	const retryMaxMs = 30_000;
	let abort: AbortController | null = null;
	let buffer = "";

	const close = () => {
		closed = true;
		abort?.abort();
		abort = null;
	};

	const scheduleReconnect = () => {
		if (closed) return;
		const delay = Math.min(retryMaxMs, retryBaseMs * 2 ** Math.min(attempt, 5));
		attempt += 1;
		setTimeout(() => {
			if (!closed) void openStream();
		}, delay);
	};

	const openStream = async () => {
		if (closed) return;
		const controller = new AbortController();
		abort = controller;
		try {
			const response = await fetch(
				`${apiBase}/tenant/sales/quick-draft/${draftId}/stream`,
				{
					method: "GET",
					headers: { Authorization: `Bearer ${accessToken}` },
					credentials: "include",
					signal: controller.signal,
				},
			);
			if (!response.ok || !response.body) {
				throw new Error(`SSE ${response.status}`);
			}
			attempt = 0;
			handlers.onOpen?.();
			buffer = "";
			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			while (!closed) {
				const { value, done } = await reader.read();
				if (done) break;
				buffer = consumeBuffer(buffer + decoder.decode(value), (event) => {
					handlers.onEvent(event);
				});
			}
		} catch (err) {
			if (closed) return;
			handlers.onError?.(err);
			scheduleReconnect();
		} finally {
			abort = null;
		}
	};

	openStream();
	return { close };
}

/**
 * React hook wrapper. Pauses when `enabled` is false or no draft is mounted.
 * Reconnects when accessToken/draftId change.
 */
export function useQuickSaleDraftStream(
	draftId: string | null,
	accessToken: string | null,
	handlers: QuickSaleDraftStreamHandlers,
	enabled = true,
): void {
	const handlersRef = useRef(handlers);
	handlersRef.current = handlers;
	useEffect(() => {
		if (!enabled || !draftId || !accessToken) return;
		const handle = subscribeQuickSaleDraftStream(
			DEFAULT_API_BASE,
			draftId,
			accessToken,
			{
				onEvent: (event) => handlersRef.current.onEvent(event),
				onError: (error) => handlersRef.current.onError?.(error),
				onOpen: () => handlersRef.current.onOpen?.(),
			},
		);
		return () => {
			handle.close();
		};
	}, [draftId, accessToken, enabled]);
}
