import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	getTenantNotificationUnreadCount,
	listTenantNotifications,
	markAllTenantNotificationsRead,
	markTenantNotificationRead,
} from "@/lib/tenant-notifications-api";
import { NotificationBell } from "./notification-bell";

vi.mock("@/lib/tenant-notifications-api", () => ({
	getTenantNotificationUnreadCount: vi.fn(),
	listTenantNotifications: vi.fn(),
	markAllTenantNotificationsRead: vi.fn(),
	markTenantNotificationRead: vi.fn(),
	syncTenantNotifications: vi.fn().mockResolvedValue({
		dayKey: "2026-07-28",
		created: 0,
		updated: 0,
		skipped: 0,
		debtOwingCustomers: 0,
		lowStockProducts: 0,
		nearExpiryProducts: 0,
	}),
	notificationTypeLabel: (type: string) => type,
	formatNotificationTime: () => "vừa xong",
}));

vi.mock("@/lib/use-tenant-notification-stream", () => ({
	useTenantNotificationStream: vi.fn(),
}));

vi.mock("@/stores/user-auth-store", () => ({
	useUserAuth: (selector: (state: unknown) => unknown) =>
		selector({
			accessToken: "token",
			hasHydrated: true,
		}),
}));

vi.mock("@/lib/use-scroll-lock", () => ({
	useScrollLock: vi.fn(),
}));

vi.mock("next/link", () => ({
	default: ({
		href,
		children,
		...props
	}: {
		href: string;
		children: React.ReactNode;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

const unreadMock = vi.mocked(getTenantNotificationUnreadCount);
const listMock = vi.mocked(listTenantNotifications);
const markReadMock = vi.mocked(markTenantNotificationRead);
const markAllMock = vi.mocked(markAllTenantNotificationsRead);

const sample = {
	items: [
		{
			id: "n1",
			type: "LOW_STOCK" as const,
			title: "Hàng sắp hết",
			body: "NPK còn 3",
			readAt: null,
			createdAt: "2026-07-28T01:00:00.000Z",
			audience: "TENANT" as const,
		},
		{
			id: "n2",
			type: "SYSTEM" as const,
			title: "Nhắc hệ thống",
			body: null,
			readAt: null,
			createdAt: "2026-07-27T01:00:00.000Z",
			audience: "USER" as const,
		},
	],
	unreadCount: 2,
};

describe("NotificationBell", () => {
	beforeEach(() => {
		unreadMock.mockReset();
		listMock.mockReset();
		markReadMock.mockReset();
		markAllMock.mockReset();
		unreadMock.mockResolvedValue({ count: 2 });
		listMock.mockResolvedValue(sample);
		markReadMock.mockResolvedValue({
			...sample.items[0],
			readAt: "2026-07-28T02:00:00.000Z",
		});
		markAllMock.mockResolvedValue({ updated: 1, unreadCount: 0 });
	});

	it("shows unread badge from live API", async () => {
		render(<NotificationBell />);
		await waitFor(() => {
			expect(screen.getByLabelText(/2 chưa đọc/i)).toBeInTheDocument();
		});
		expect(unreadMock).toHaveBeenCalled();
	});

	it("opens panel, lists items, marks one and all as read", async () => {
		render(<NotificationBell />);
		await waitFor(() => {
			expect(unreadMock).toHaveBeenCalled();
		});
		fireEvent.click(screen.getByRole("button", { name: /Thông báo/i }));
		// Desktop popover + mobile sheet both mount; assert at least one list.
		await waitFor(() => {
			expect(screen.getAllByText("Hàng sắp hết").length).toBeGreaterThan(0);
		});
		expect(listMock).toHaveBeenCalled();

		fireEvent.click(
			screen.getAllByRole("button", {
				name: /Đánh dấu đã đọc: Hàng sắp hết/i,
			})[0],
		);
		await waitFor(() => {
			expect(markReadMock).toHaveBeenCalledWith("n1");
		});
		// After one mark-read, 1 unread remains so mark-all stays enabled.
		await waitFor(() => {
			expect(
				screen.getAllByRole("button", { name: /Đọc hết/i })[0],
			).not.toBeDisabled();
		});

		fireEvent.click(screen.getAllByRole("button", { name: /Đọc hết/i })[0]);
		await waitFor(() => {
			expect(markAllMock).toHaveBeenCalled();
		});
	});

	it("shows error state with retry", async () => {
		listMock.mockRejectedValueOnce({ reason: "NETWORK_ERROR" });
		render(<NotificationBell />);
		fireEvent.click(screen.getByRole("button", { name: /Thông báo/i }));
		await waitFor(() => {
			expect(screen.getAllByRole("alert").length).toBeGreaterThan(0);
		});
		listMock.mockResolvedValueOnce(sample);
		fireEvent.click(screen.getAllByRole("button", { name: /Thử lại/i })[0]);
		await waitFor(() => {
			expect(screen.getAllByText("Hàng sắp hết").length).toBeGreaterThan(0);
		});
	});
});
