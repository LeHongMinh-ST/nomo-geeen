import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	listTenantNotifications,
	markAllTenantNotificationsRead,
	markTenantNotificationRead,
} from "@/lib/tenant-notifications-api";
import { NotificationsPage } from "./notifications-page";

vi.mock("@/lib/tenant-notifications-api", () => ({
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

vi.mock("@/stores/user-auth-store", () => ({
	useUserAuth: (selector: (state: unknown) => unknown) =>
		selector({
			accessToken: "token",
			hasHydrated: true,
		}),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ back: vi.fn() }),
}));

const listMock = vi.mocked(listTenantNotifications);
const markAllMock = vi.mocked(markAllTenantNotificationsRead);
const markReadMock = vi.mocked(markTenantNotificationRead);

describe("NotificationsPage", () => {
	beforeEach(() => {
		listMock.mockReset();
		markAllMock.mockReset();
		markReadMock.mockReset();
	});

	it("renders live list and mark-all action", async () => {
		listMock.mockResolvedValue({
			items: [
				{
					id: "n1",
					type: "DEBT_DUE",
					title: "Công nợ đến hạn",
					body: "Khách A",
					readAt: null,
					createdAt: "2026-07-28T01:00:00.000Z",
					audience: "USER",
				},
			],
			unreadCount: 1,
		});
		markAllMock.mockResolvedValue({ updated: 1, unreadCount: 0 });
		render(<NotificationsPage />);
		await waitFor(() => {
			expect(screen.getByText("Công nợ đến hạn")).toBeInTheDocument();
		});
		fireEvent.click(
			screen.getByRole("button", { name: /Đánh dấu tất cả đã đọc/i }),
		);
		await waitFor(() => {
			expect(markAllMock).toHaveBeenCalled();
		});
	});

	it("shows empty state without inventing rows", async () => {
		listMock.mockResolvedValue({ items: [], unreadCount: 0 });
		render(<NotificationsPage />);
		await waitFor(() => {
			expect(screen.getByText("Chưa có thông báo")).toBeInTheDocument();
		});
	});

	it("marks a single notification from the page", async () => {
		listMock.mockResolvedValue({
			items: [
				{
					id: "n9",
					type: "SYSTEM",
					title: "Hệ thống",
					body: "Ping",
					readAt: null,
					createdAt: "2026-07-28T01:00:00.000Z",
					audience: "TENANT",
				},
			],
			unreadCount: 1,
		});
		markReadMock.mockResolvedValue({
			id: "n9",
			type: "SYSTEM",
			title: "Hệ thống",
			body: "Ping",
			readAt: "2026-07-28T02:00:00.000Z",
			createdAt: "2026-07-28T01:00:00.000Z",
			audience: "TENANT",
		});
		render(<NotificationsPage />);
		await waitFor(() => {
			expect(screen.getByText("Hệ thống")).toBeInTheDocument();
		});
		fireEvent.click(
			screen.getByRole("button", { name: /Đánh dấu đã đọc: Hệ thống/i }),
		);
		await waitFor(() => {
			expect(markReadMock).toHaveBeenCalledWith("n9");
		});
	});
});
