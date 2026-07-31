import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTenantSupplier } from "@/lib/tenant-suppliers-api";
import { SupplierForm } from "./supplier-form";

const push = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push, back: vi.fn() }),
}));
vi.mock("@/lib/tenant-suppliers-api", async () => {
	const actual = await vi.importActual<
		typeof import("@/lib/tenant-suppliers-api")
	>("@/lib/tenant-suppliers-api");
	return {
		...actual,
		createTenantSupplier: vi.fn(),
		updateTenantSupplier: vi.fn(),
	};
});

describe("SupplierForm", () => {
	beforeEach(() => {
		push.mockReset();
		vi.mocked(createTenantSupplier)
			.mockReset()
			.mockResolvedValue({} as never);
	});

	it("does not send empty optional fields during creation", async () => {
		render(<SupplierForm mode="create" />);
		fireEvent.change(screen.getByPlaceholderText("VD: Vật tư Bình Điền"), {
			target: { value: "  Nhà cung cấp A  " },
		});
		fireEvent.click(
			screen.getAllByRole("button", { name: "Thêm nhà cung cấp" })[0],
		);

		await waitFor(() =>
			expect(createTenantSupplier).toHaveBeenCalledWith({
				name: "Nhà cung cấp A",
			}),
		);
		expect(push).toHaveBeenCalledWith("/nha-cung-cap");
	});
});
