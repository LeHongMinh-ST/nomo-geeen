import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateTenantForm } from "../create-tenant-form";

const { createTenant } = vi.hoisted(() => ({ createTenant: vi.fn() }));
vi.mock("@/lib/admin-api/tenants", () => ({ createTenant }));
vi.mock("@/stores/admin-auth-store", () => ({
	useAdminAuth: (selector: (state: { accessToken: string }) => unknown) =>
		selector({ accessToken: "token" }),
}));
vi.mock("next/navigation", () => ({
	useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

describe("CreateTenantForm", () => {
	beforeEach(() => createTenant.mockReset());

	it("preserves entered values and shows SLUG_TAKEN inline", async () => {
		createTenant.mockRejectedValueOnce(
			Object.assign(new Error("conflict"), {
				reason: "SLUG_TAKEN",
				status: 409,
			}),
		);
		render(<CreateTenantForm />);
		fireEvent.change(screen.getByLabelText("Tên cửa hàng"), {
			target: { value: "Cửa hàng Minh" },
		});
		fireEvent.change(screen.getByLabelText("Slug"), {
			target: { value: "cua-hang-minh" },
		});
		fireEvent.change(screen.getByLabelText("Họ và tên"), {
			target: { value: "Nguyễn Minh" },
		});
		fireEvent.change(screen.getByLabelText("Tên đăng nhập"), {
			target: { value: "minh-owner" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Tạo cửa hàng" }));
		await waitFor(() => expect(createTenant).toHaveBeenCalled());
		await waitFor(() =>
			expect(screen.getByRole("alert")).toHaveTextContent(
				"Slug này đã được sử dụng",
			),
		);
		expect(screen.getByDisplayValue("cua-hang-minh")).toBeInTheDocument();
		expect(screen.getByDisplayValue("minh-owner")).toBeInTheDocument();
	});
});
