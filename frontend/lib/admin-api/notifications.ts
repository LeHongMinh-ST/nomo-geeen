import { adminFetch } from "./fetch";

export type AdminNotificationView = {
	id: string;
	type: string;
	title: string;
	body: string | null;
	readAt: string | null;
	createdAt: string;
};

export type AdminNotificationListResult = {
	items: AdminNotificationView[];
	unreadCount: number;
	page: number;
	pageSize: number;
	total: number;
};

export type AdminNotificationQuery = Partial<{
	page: number;
	pageSize: number;
	unreadOnly: boolean;
}>;

function queryString(query: AdminNotificationQuery): string {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value !== undefined && value !== null) params.set(key, String(value));
	}
	return params.toString();
}

export function listAdminNotifications(
	accessToken: string,
	query: AdminNotificationQuery = {},
): Promise<AdminNotificationListResult> {
	const suffix = queryString(query);
	return adminFetch<AdminNotificationListResult>(
		`/admin/notifications${suffix ? `?${suffix}` : ""}`,
		{ accessToken },
	);
}

export function unreadAdminNotificationsCount(
	accessToken: string,
): Promise<{ count: number }> {
	return adminFetch<{ count: number }>("/admin/notifications/unread-count", {
		accessToken,
	});
}

export function markAdminNotificationRead(
	accessToken: string,
	notificationId: string,
): Promise<AdminNotificationView> {
	return adminFetch<AdminNotificationView>(
		`/admin/notifications/${notificationId}/read`,
		{
			method: "POST",
			accessToken,
		},
	);
}

export function markAllAdminNotificationsRead(
	accessToken: string,
): Promise<{ updated: number; unreadCount: number }> {
	return adminFetch<{ updated: number; unreadCount: number }>(
		"/admin/notifications/read-all",
		{
			method: "POST",
			accessToken,
		},
	);
}
