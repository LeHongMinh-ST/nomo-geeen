import { describe, expect, it } from "vitest";
import {
	bottomNavItems,
	filterNavGroups,
	filterNavItems,
	navGroups,
} from "./navigation";

describe("tenant navigation permissions", () => {
	it("hides report and keeps operational menus for STAFF", () => {
		const permissions = [
			"dashboard:view",
			"sales:create",
			"sales:view",
			"handbook:view",
			"product:view",
			"purchase:view",
			"inventory:view",
			"customer:view",
			"supplier:view",
			"debt:view",
		];
		const visible = filterNavGroups(navGroups, permissions).flatMap((group) =>
			group.items.map((item) => item.label),
		);

		expect(visible).toContain("Bán nhanh");
		expect(visible).toContain("Công nợ");
		expect(visible).not.toContain("Báo cáo");
	});

	it("shows report menu for MANAGER and keeps the mobile shell aligned", () => {
		const permissions = [
			"dashboard:view",
			"sales:view",
			"handbook:view",
			"report:view",
		];
		const visible = filterNavGroups(navGroups, permissions).flatMap((group) =>
			group.items.map((item) => item.label),
		);
		expect(visible).toContain("Báo cáo");
		expect(visible).not.toContain("Sản phẩm");
		expect(
			filterNavItems(bottomNavItems, permissions).map((item) => item.label),
		).toEqual(["Trang chủ", "Đơn hàng", "Sổ tay", "Khác"]);
	});
});
