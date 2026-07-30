import { beforeEach, describe, expect, it, vi } from "vitest";
import { userFetch } from "@/lib/user-fetch";
import {
	formatNotificationTime,
	getTenantNotificationUnreadCount,
	listTenantNotifications,
	markAllTenantNotificationsRead,
	markTenantNotificationRead,
	notificationHref,
	notificationTypeLabel,
	syncTenantNotifications,
} from "./tenant-notifications-api";

vi.mock("@/lib/user-fetch", () => ({ userFetch: vi.fn() }));
const mocked = vi.mocked(userFetch);

describe("tenant notifications api", () => {
	beforeEach(() => mocked.mockReset());

	it("lists notifications with optional filters", () => {
		listTenantNotifications({ limit: 20, unreadOnly: true });
		expect(mocked).toHaveBeenCalledWith(
			"/tenant/notifications?limit=20&unreadOnly=true",
		);
		listTenantNotifications();
		expect(mocked).toHaveBeenCalledWith("/tenant/notifications");
	});

	it("loads unread count and mark endpoints", () => {
		getTenantNotificationUnreadCount();
		expect(mocked).toHaveBeenCalledWith("/tenant/notifications/unread-count");
		markTenantNotificationRead("n1");
		expect(mocked).toHaveBeenCalledWith("/tenant/notifications/n1/read", {
			method: "POST",
		});
		markAllTenantNotificationsRead();
		expect(mocked).toHaveBeenCalledWith("/tenant/notifications/read-all", {
			method: "POST",
		});
		syncTenantNotifications();
		expect(mocked).toHaveBeenCalledWith("/tenant/notifications/sync", {
			method: "POST",
		});
	});

	it("maps type labels and relative time", () => {
		expect(notificationTypeLabel("DEBT_DUE")).toBe("Công nợ");
		expect(notificationTypeLabel("LOW_STOCK")).toBe("Tồn kho");
		expect(notificationTypeLabel("NEAR_EXPIRED")).toBe("Hạn dùng");
		expect(notificationTypeLabel("SYSTEM")).toBe("Hệ thống");
		expect(notificationHref("DEBT_DUE")).toBe("/cong-no");
		expect(notificationHref("LOW_STOCK")).toBe("/ton-kho");
		expect(notificationHref("NEAR_EXPIRED")).toBe("/ton-kho");
		expect(notificationHref("SYSTEM")).toBe("/thong-bao");
		const recent = new Date(Date.now() - 2 * 60_000).toISOString();
		expect(formatNotificationTime(recent)).toBe("2 phút trước");
		expect(formatNotificationTime("bad")).toBe("");
	});
});
