import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MoreSheet } from "./more-sheet";

const { logout, replace } = vi.hoisted(() => ({
	logout: vi.fn(),
	replace: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ replace }),
}));

vi.mock("@/lib/navigation", () => ({ navGroups: [] }));

vi.mock("@/stores/user-auth-store", () => ({
	useUserAuth: (selector: (state: unknown) => unknown) =>
		selector({ logout, loading: false }),
}));

describe("MoreSheet", () => {
	beforeEach(() => {
		logout.mockReset().mockResolvedValue(undefined);
		replace.mockReset();
	});

	it("logs out and redirects when mobile logout is clicked", async () => {
		const onClose = vi.fn();
		render(<MoreSheet open onClose={onClose} />);

		fireEvent.click(screen.getByRole("button", { name: "Đăng xuất" }));

		await waitFor(() => expect(logout).toHaveBeenCalledTimes(1));
		expect(onClose).toHaveBeenCalledTimes(1);
		expect(replace).toHaveBeenCalledWith("/dang-nhap");
	});
});
