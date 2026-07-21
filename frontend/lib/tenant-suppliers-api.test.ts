import { beforeEach, describe, expect, it, vi } from "vitest";
import { userFetch } from "@/lib/user-fetch";
import { createTenantSupplier, getTenantSupplier, listTenantSuppliers, updateTenantSupplier } from "./tenant-suppliers-api";

vi.mock("@/lib/user-fetch", () => ({ userFetch: vi.fn() }));
const mocked = vi.mocked(userFetch);

describe("tenant suppliers api", () => {
	beforeEach(() => mocked.mockReset());
	it("builds bounded list query and detail route", () => {
		listTenantSuppliers({ page: 2, pageSize: 20, search: "NCC" });
		getTenantSupplier("supplier-1");
		expect(mocked).toHaveBeenNthCalledWith(1, "/tenant/suppliers?page=2&pageSize=20&search=NCC");
		expect(mocked).toHaveBeenNthCalledWith(2, "/tenant/suppliers/supplier-1");
	});
	it("sends create and update bodies unchanged and propagates client errors", async () => {
		const input = { code: "SUP-1", name: "Supplier" };
		createTenantSupplier(input);
		updateTenantSupplier("supplier-1", { name: "Renamed" });
		expect(mocked).toHaveBeenNthCalledWith(1, "/tenant/suppliers", { method: "POST", body: JSON.stringify(input) });
		expect(mocked).toHaveBeenNthCalledWith(2, "/tenant/suppliers/supplier-1", { method: "PATCH", body: JSON.stringify({ name: "Renamed" }) });
		const error = new Error("duplicate")
		mocked.mockRejectedValueOnce(error);
		await expect(listTenantSuppliers()).rejects.toBe(error);
	});
});
