import { beforeEach, describe, expect, it, vi } from "vitest";
import { userFetch } from "@/lib/user-fetch";
import {
	getTenantInventoryDetail,
	listTenantInventory,
} from "./tenant-inventory-api";

vi.mock("@/lib/user-fetch", () => ({ userFetch: vi.fn() }));
const mocked = vi.mocked(userFetch);
describe("tenant inventory api", () => {
	beforeEach(() => mocked.mockReset());
	it("uses bounded inventory list query", () => {
		listTenantInventory({ page: 2, pageSize: 20, search: "SKU" });
		expect(mocked).toHaveBeenCalledWith(
			"/tenant/inventory?page=2&pageSize=20&search=SKU",
		);
	});
	it("loads product inventory detail through the tenant route", () => {
		getTenantInventoryDetail("product-1");
		expect(mocked).toHaveBeenCalledWith("/tenant/inventory/product-1");
	});
});
