"use client";

import { CheckCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
	NotificationEmpty,
	NotificationError,
	NotificationList,
	NotificationLoading,
} from "@/components/app/notifications/notification-list";
import { SettingHeader } from "@/components/app/setting-header";
import {
	listTenantNotifications,
	markAllTenantNotificationsRead,
	markTenantNotificationRead,
	syncTenantNotifications,
	type TenantNotification,
} from "@/lib/tenant-notifications-api";
import { useTenantNotificationStream } from "@/lib/use-tenant-notification-stream";
import { useUserAuth } from "@/stores/user-auth-store";

type LoadState = "loading" | "ready" | "error";

/**
 * Full notifications page — mobile/PWA primary surface + desktop "Xem tất cả".
 */
export function NotificationsPage() {
	const accessToken = useUserAuth((state) => state.accessToken);
	const hasHydrated = useUserAuth((state) => state.hasHydrated);
	const [items, setItems] = useState<TenantNotification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [state, setState] = useState<LoadState>("loading");
	const [busyId, setBusyId] = useState<string | null>(null);
	const [markingAll, setMarkingAll] = useState(false);

	const load = useCallback(async () => {
		if (!accessToken) return;
		setState("loading");
		try {
			await syncTenantNotifications().catch(() => null);
			const result = await listTenantNotifications({ limit: 50 });
			setItems(result.items);
			setUnreadCount(result.unreadCount);
			setState("ready");
		} catch {
			setState("error");
		}
	}, [accessToken]);

	useEffect(() => {
		if (!hasHydrated) return;
		if (!accessToken) {
			setState("error");
			return;
		}
		void load();
	}, [hasHydrated, accessToken, load]);

	useTenantNotificationStream({
		accessToken,
		enabled: hasHydrated && Boolean(accessToken),
		onChanged: () => {
			void load();
		},
		onReconnect: () => {
			void load();
		},
	});

	async function handleMarkRead(id: string) {
		setBusyId(id);
		try {
			const updated = await markTenantNotificationRead(id);
			setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
			setUnreadCount((count) => Math.max(0, count - 1));
		} catch {
			// Keep prior state.
		} finally {
			setBusyId(null);
		}
	}

	async function handleMarkAll() {
		if (unreadCount === 0 || markingAll) return;
		setMarkingAll(true);
		try {
			const result = await markAllTenantNotificationsRead();
			setUnreadCount(result.unreadCount);
			const now = new Date().toISOString();
			setItems((prev) =>
				prev.map((item) => (item.readAt ? item : { ...item, readAt: now })),
			);
		} catch {
			// Keep prior state.
		} finally {
			setMarkingAll(false);
		}
	}

	return (
		<div className="flex flex-col gap-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<SettingHeader
					title="Thông báo"
					description={
						unreadCount > 0
							? `${unreadCount} chưa đọc`
							: "Toàn bộ thông báo cửa hàng"
					}
				/>
				<button
					type="button"
					onClick={() => void handleMarkAll()}
					disabled={unreadCount === 0 || markingAll || state !== "ready"}
					className="flex min-h-12 items-center gap-2 rounded-[12px] border border-border bg-card px-4 text-base font-semibold text-primary transition-colors hover:bg-[#e8f5e9] disabled:cursor-not-allowed disabled:opacity-40"
				>
					<CheckCheck className="size-5" aria-hidden />
					Đánh dấu tất cả đã đọc
				</button>
			</div>

			{state === "loading" ? <NotificationLoading rows={6} /> : null}
			{state === "error" ? (
				<div className="rounded-[16px] border border-border bg-card">
					<NotificationError onRetry={() => void load()} />
				</div>
			) : null}
			{state === "ready" && items.length === 0 ? (
				<div className="rounded-[16px] border border-border bg-card">
					<NotificationEmpty />
				</div>
			) : null}
			{state === "ready" && items.length > 0 ? (
				<NotificationList
					items={items}
					busyId={busyId}
					onMarkRead={(id) => void handleMarkRead(id)}
				/>
			) : null}
		</div>
	);
}
