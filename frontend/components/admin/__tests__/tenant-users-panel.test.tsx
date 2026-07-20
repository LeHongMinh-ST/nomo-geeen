import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TenantUsersPanel } from "../tenant-users-panel";

const { listTenantUsers, createTenantUser, changeTenantUserRole } = vi.hoisted(
	() => ({
		listTenantUsers: vi.fn(),
		createTenantUser: vi.fn(),
		changeTenantUserRole: vi.fn(),
	}),
);
vi.mock("@/lib/admin-api/tenant-users", () => ({
	listTenantUsers,
	createTenantUser,
	changeTenantUserRole,
	deactivateTenantUser: vi.fn(),
	reactivateTenantUser: vi.fn(),
	resetTenantUserPassword: vi.fn(),
	updateTenantUser: vi.fn(),
}));
vi.mock("@/stores/admin-auth-store", () => ({
	useAdminAuth: (selector: (state: { accessToken: string }) => unknown) =>
		selector({ accessToken: "token" }),
}));
vi.mock("@/hooks/use-has-permission", () => ({ useHasPermission: () => true }));

const result = (activeCount: number, effectiveMaxUsers: number) => ({
	items: [
		{
			id: "u1",
			tenantId: "t1",
			fullName: "Owner",
			username: "owner",
			phone: null,
			email: null,
			roleCode: "OWNER",
			status: "ACTIVE",
			mustChangePassword: false,
			lastLoginAt: null,
			createdAt: "2026-01-01",
			updatedAt: "2026-01-01",
		},
	],
	page: 1,
	pageSize: 100,
	total: 1,
	seatUsage: { activeCount, effectiveMaxUsers, planCode: null, seatBonus: 10 },
});

describe("TenantUsersPanel", () => {
	beforeEach(() => {
		listTenantUsers.mockReset();
		createTenantUser.mockReset();
		changeTenantUserRole.mockReset();
		window.confirm = vi.fn(() => true) as typeof window.confirm;
	});

	it("blocks create when seats are exhausted", async () => {
		listTenantUsers.mockResolvedValue(result(1, 1));
		render(<TenantUsersPanel tenantId="t1" />);
		await waitFor(() =>
			expect(screen.getByText(/SEAT_LIMIT_REACHED/)).toBeInTheDocument(),
		);
		expect(
			screen.getByRole("button", { name: "Tạo người dùng" }),
		).toBeDisabled();
	});

	it("refetches after successful user creation", async () => {
		listTenantUsers.mockResolvedValue(result(0, 2));
		createTenantUser.mockResolvedValue({
			user: { ...result(0, 2).items[0], id: "u2", username: "staff" },
			generatedPassword: null,
		});
		render(<TenantUsersPanel tenantId="t1" />);
		await waitFor(() =>
			expect(
				screen.getByRole("button", { name: "Tạo người dùng" }),
			).toBeEnabled(),
		);
		fireEvent.click(screen.getByRole("button", { name: "Tạo người dùng" }));
		fireEvent.change(screen.getByLabelText("Họ và tên"), {
			target: { value: "Staff" },
		});
		fireEvent.change(screen.getByLabelText("Tên đăng nhập"), {
			target: { value: "staff" },
		});
		fireEvent.click(
			screen.getAllByRole("button", { name: "Tạo người dùng" })[1],
		);
		await waitFor(() => expect(createTenantUser).toHaveBeenCalled());
		await waitFor(() => expect(listTenantUsers).toHaveBeenCalledTimes(2));
	});

	it("changes role independently and refetches", async () => {
		listTenantUsers.mockResolvedValue(result(0, 2));
		changeTenantUserRole.mockResolvedValue({
			...result(0, 2).items[0],
			roleCode: "MANAGER",
		});
		render(<TenantUsersPanel tenantId="t1" />);
		const select = await screen.findByRole("combobox", {
			name: "Đổi vai trò Owner",
		});
		fireEvent.change(select, { target: { value: "MANAGER" } });
		await waitFor(() =>
			expect(changeTenantUserRole).toHaveBeenCalledWith(
				"token",
				"t1",
				"u1",
				"MANAGER",
			),
		);
		await waitFor(() => expect(listTenantUsers).toHaveBeenCalledTimes(2));
	});
});
