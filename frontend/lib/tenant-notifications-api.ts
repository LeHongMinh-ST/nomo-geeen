import { userFetch } from "@/lib/user-fetch";

export type NotificationType =
	| "DEBT_DUE"
	| "LOW_STOCK"
	| "NEAR_EXPIRED"
	| "SYSTEM";

export type TenantNotification = {
	id: string;
	type: NotificationType;
	title: string;
	body: string | null;
	readAt: string | null;
	createdAt: string;
	audience: "USER" | "TENANT";
};

export type NotificationListResult = {
	items: TenantNotification[];
	unreadCount: number;
};

export type UnreadCountResult = {
	count: number;
};

export type MarkAllReadResult = {
	updated: number;
	unreadCount: number;
};

export function listTenantNotifications(params?: {
	limit?: number;
	unreadOnly?: boolean;
}): Promise<NotificationListResult> {
	const search = new URLSearchParams();
	if (params?.limit != null) search.set("limit", String(params.limit));
	if (params?.unreadOnly) search.set("unreadOnly", "true");
	const query = search.toString();
	return userFetch<NotificationListResult>(
		`/tenant/notifications${query ? `?${query}` : ""}`,
	);
}

export function getTenantNotificationUnreadCount(): Promise<UnreadCountResult> {
	return userFetch<UnreadCountResult>("/tenant/notifications/unread-count");
}

export function markTenantNotificationRead(
	id: string,
): Promise<TenantNotification> {
	return userFetch<TenantNotification>(`/tenant/notifications/${id}/read`, {
		method: "POST",
	});
}

export function markAllTenantNotificationsRead(): Promise<MarkAllReadResult> {
	return userFetch<MarkAllReadResult>("/tenant/notifications/read-all", {
		method: "POST",
	});
}

export type NotificationSyncResult = {
	dayKey: string;
	created: number;
	updated: number;
	skipped: number;
	debtOwingCustomers: number;
	lowStockProducts: number;
	nearExpiryProducts: number;
};

/** Run server producers (debt/low-stock/near-expiry) before reading the inbox. */
export function syncTenantNotifications(): Promise<NotificationSyncResult> {
	return userFetch<NotificationSyncResult>("/tenant/notifications/sync", {
		method: "POST",
	});
}

export type {
	NotificationStreamEvent,
	NotificationStreamHandle,
} from "@/lib/tenant-notification-stream";
/**
 * Live hint channel — see `tenant-notification-stream.ts`.
 * Prefer `subscribeTenantNotificationStream` (fetch + Bearer); not EventSource.
 */
export { subscribeTenantNotificationStream } from "@/lib/tenant-notification-stream";

export function notificationTypeLabel(type: NotificationType): string {
	switch (type) {
		case "DEBT_DUE":
			return "Công nợ";
		case "LOW_STOCK":
			return "Tồn kho";
		case "NEAR_EXPIRED":
			return "Hạn dùng";
		default:
			return "Hệ thống";
	}
}

export function formatNotificationTime(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	const now = Date.now();
	const diffMs = now - date.getTime();
	const minute = 60_000;
	const hour = 60 * minute;
	const day = 24 * hour;
	if (diffMs < minute) return "Vừa xong";
	if (diffMs < hour) return `${Math.floor(diffMs / minute)} phút trước`;
	if (diffMs < day) return `${Math.floor(diffMs / hour)} giờ trước`;
	if (diffMs < 7 * day) return `${Math.floor(diffMs / day)} ngày trước`;
	return date.toLocaleDateString("vi-VN", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}
