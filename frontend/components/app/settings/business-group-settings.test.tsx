import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BusinessGroupSettings } from "./business-group-settings";

const { getTenantBusinessGroups, updateTenantBusinessGroups } = vi.hoisted(
	() => ({
		getTenantBusinessGroups: vi.fn(),
		updateTenantBusinessGroups: vi.fn(),
	}),
);

vi.mock("next/navigation", () => ({
	useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));
vi.mock("@/lib/tenant-products-api", () => ({
	getTenantBusinessGroups,
	updateTenantBusinessGroups,
}));

const permissions = { current: ["product:view", "product:edit"] };
vi.mock("@/stores/user-auth-store", () => ({
	useUserAuth: (selector: (state: unknown) => unknown) =>
		selector({ user: { permissions: permissions.current } }),
}));

const CONFIGURED = {
	configured: true,
	groups: [
		{ businessGroup: "CROP_INPUTS", enabled: true },
		{ businessGroup: "CROP_SEEDLINGS", enabled: false },
		{ businessGroup: "ANIMAL_FEED", enabled: false },
		{ businessGroup: "VETERINARY_DRUGS", enabled: false },
		{ businessGroup: "HUMAN_DRUGS", enabled: false },
	],
	productCounts: {
		CROP_INPUTS: 12,
		CROP_SEEDLINGS: 3,
		ANIMAL_FEED: 0,
		VETERINARY_DRUGS: 0,
		HUMAN_DRUGS: 0,
	},
};

function switchFor(label: string) {
	return screen.getByRole("switch", { name: label });
}

describe("BusinessGroupSettings", () => {
	beforeEach(() => {
		permissions.current = ["product:view", "product:edit"];
		getTenantBusinessGroups.mockReset().mockResolvedValue(CONFIGURED);
		updateTenantBusinessGroups.mockReset().mockResolvedValue(CONFIGURED);
	});

	it("renders the five catalog groups with saved state and product counts", async () => {
		render(<BusinessGroupSettings />);

		await waitFor(() =>
			expect(switchFor("Thuốc bảo vệ thực vật + Phân bón")).toBeInTheDocument(),
		);
		for (const label of [
			"Thuốc bảo vệ thực vật + Phân bón",
			"Cây trồng",
			"Thức ăn chăn nuôi",
			"Thuốc thú y",
			"Thuốc (dùng cho người)",
		])
			expect(switchFor(label)).toBeInTheDocument();

		expect(switchFor("Thuốc bảo vệ thực vật + Phân bón")).toHaveAttribute(
			"aria-checked",
			"true",
		);
		expect(switchFor("Cây trồng")).toHaveAttribute("aria-checked", "false");
		expect(screen.getByText("Đang có 12 sản phẩm")).toBeInTheDocument();
		expect(screen.getByText("Đang có 3 sản phẩm")).toBeInTheDocument();
		expect(screen.getAllByText("Chưa có sản phẩm nào")).toHaveLength(3);
	});

	it("spells out that disabling a group keeps existing data", async () => {
		render(<BusinessGroupSettings />);

		expect(
			screen.getByText("Gói dịch vụ quyết định nhóm hàng"),
		).toBeInTheDocument();
		expect(
			screen.getByText(/chỉ ngăn tạo sản phẩm mới và thêm dòng bán hàng mới/i),
		).toBeInTheDocument();
		expect(
			screen.getByText(/Sản phẩm, tồn kho, chứng từ, Sổ tay và lịch sử/i),
		).toBeInTheDocument();
	});

	it("treats an unconfigured shop as basic crop-inputs only", async () => {
		getTenantBusinessGroups.mockResolvedValue({
			configured: false,
			groups: [],
		});
		render(<BusinessGroupSettings />);

		await waitFor(() =>
			expect(switchFor("Thuốc (dùng cho người)")).toHaveAttribute(
				"aria-checked",
				"false",
			),
		);
		expect(switchFor("Cây trồng")).toHaveAttribute("aria-checked", "false");
		expect(screen.getAllByText("Chưa có trong gói dịch vụ")).toHaveLength(4);
	});

	it("saves the toggled set and confirms success", async () => {
		render(<BusinessGroupSettings />);
		await waitFor(() => expect(switchFor("Cây trồng")).toBeInTheDocument());

		fireEvent.click(switchFor("Cây trồng"));
		expect(switchFor("Cây trồng")).toHaveAttribute("aria-checked", "true");
		fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

		await waitFor(() =>
			expect(updateTenantBusinessGroups).toHaveBeenCalledTimes(1),
		);
		expect([...updateTenantBusinessGroups.mock.calls[0][0]].sort()).toEqual([
			"CROP_INPUTS",
			"CROP_SEEDLINGS",
		]);
		expect(
			await screen.findByText("Đã lưu nhóm kinh doanh."),
		).toBeInTheDocument();
	});

	it("blocks saving when every group is switched off", async () => {
		render(<BusinessGroupSettings />);
		await waitFor(() =>
			expect(switchFor("Thuốc bảo vệ thực vật + Phân bón")).toBeInTheDocument(),
		);

		fireEvent.click(switchFor("Thuốc bảo vệ thực vật + Phân bón"));

		const save = screen.getByRole("button", { name: "Lưu thay đổi" });
		expect(save).toBeDisabled();
		expect(
			screen.getByText(
				"Phải bật ít nhất một nhóm. Nếu tắt hết, cửa hàng sẽ không tạo được sản phẩm nào.",
			),
		).toBeInTheDocument();

		fireEvent.click(save);
		expect(updateTenantBusinessGroups).not.toHaveBeenCalled();
	});

	it("surfaces the backend 422 when an all-off payload slips through", async () => {
		updateTenantBusinessGroups.mockRejectedValue(
			Object.assign(new Error("422"), {
				status: 422,
				reason: "NO_ENABLED_BUSINESS_GROUP",
			}),
		);
		render(<BusinessGroupSettings />);
		await waitFor(() => expect(switchFor("Cây trồng")).toBeInTheDocument());

		fireEvent.click(switchFor("Cây trồng"));
		fireEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

		expect(
			await screen.findByText(
				"Phải bật ít nhất một nhóm. Nếu tắt hết, cửa hàng sẽ không tạo được sản phẩm nào.",
			),
		).toBeInTheDocument();
	});

	it("hides the save action without product:edit", async () => {
		permissions.current = ["product:view"];
		render(<BusinessGroupSettings />);

		await waitFor(() => expect(switchFor("Cây trồng")).toBeDisabled());
		expect(
			screen.queryByRole("button", { name: "Lưu thay đổi" }),
		).not.toBeInTheDocument();
	});

	it("refuses to render the list without product:view", async () => {
		permissions.current = [];
		render(<BusinessGroupSettings />);

		expect(
			screen.getByText("Bạn không có quyền xem nhóm kinh doanh của cửa hàng."),
		).toBeInTheDocument();
		expect(getTenantBusinessGroups).not.toHaveBeenCalled();
	});
});
