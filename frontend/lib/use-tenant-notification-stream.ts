"use client";

import { useEffect, useRef } from "react";
import {
	type NotificationStreamEvent,
	subscribeTenantNotificationStream,
} from "@/lib/tenant-notification-stream";

export type UseTenantNotificationStreamOptions = {
	accessToken: string | null | undefined;
	enabled?: boolean;
	/**
	 * Called for notification.changed (not heartbeat).
	 * Caller should re-fetch unread-count and optionally list (source of truth).
	 */
	onChanged: () => void;
	/** Called after successful stream open / reconnect — re-sync list/unread. */
	onReconnect?: () => void;
	/**
	 * Polling fallback interval while stream is down (ms).
	 * Default 60s. Set 0 to disable.
	 */
	fallbackPollMs?: number;
};

/**
 * Wire SSE + reconnect refresh + polling fallback for tenant notifications.
 * Cleanup on unmount / token change. Does not own list state.
 */
export function useTenantNotificationStream(
	options: UseTenantNotificationStreamOptions,
): void {
	const {
		accessToken,
		enabled = true,
		onChanged,
		onReconnect,
		fallbackPollMs = 60_000,
	} = options;

	const onChangedRef = useRef(onChanged);
	const onReconnectRef = useRef(onReconnect);
	onChangedRef.current = onChanged;
	onReconnectRef.current = onReconnect;

	useEffect(() => {
		if (!enabled || !accessToken) return;

		let streamHealthy = false;
		let pollTimer: ReturnType<typeof setInterval> | null = null;

		const stopPoll = () => {
			if (pollTimer) {
				clearInterval(pollTimer);
				pollTimer = null;
			}
		};

		const startPoll = () => {
			if (fallbackPollMs <= 0 || pollTimer) return;
			pollTimer = setInterval(() => {
				if (!streamHealthy) {
					onChangedRef.current();
				}
			}, fallbackPollMs);
		};

		const handle = subscribeTenantNotificationStream(
			{ accessToken },
			{
				onOpen: () => {
					streamHealthy = true;
					stopPoll();
					onReconnectRef.current?.();
				},
				onEvent: (event: NotificationStreamEvent) => {
					if (event.type === "notification.changed") {
						onChangedRef.current();
					}
				},
				onError: () => {
					streamHealthy = false;
					startPoll();
				},
			},
		);

		// Immediate fallback until first successful open.
		startPoll();

		return () => {
			stopPoll();
			handle.close();
		};
	}, [accessToken, enabled, fallbackPollMs]);
}
