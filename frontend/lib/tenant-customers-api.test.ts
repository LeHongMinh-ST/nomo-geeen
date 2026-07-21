import { beforeEach, describe, expect, it, vi } from "vitest";
import { userFetch } from "@/lib/user-fetch";
import {
	createCustomer,
	deleteCustomer,
	getCustomer,
	listCustomers,
	updateCustomer,
} from "./tenant-customers-api";

vi.mock("@/lib/user-fetch", () => ({ userFetch: vi.fn() }));
const mocked = vi.mocked(userFetch);

describe("tenant customers api", () => {
	beforeEach(() => mocked.mockReset());

	it("builds list, detail, and delete routes", () => {
		listCustomers({ page: 2, pageSize: 20, search: "Anh Ba" });
		getCustomer("customer-1");
		deleteCustomer("customer-1");
		expect(mocked).toHaveBeenNthCalledWith(
			1,
			"/tenant/customers?page=2&pageSize=20&search=Anh+Ba",
		);
		expect(mocked).toHaveBeenNthCalledWith(2, "/tenant/customers/customer-1");
		expect(mocked).toHaveBeenNthCalledWith(
			3,
			"/tenant/customers/customer-1",
			{ method: "DELETE" },
		);
	});

	it("sends contact-only create/update payloads and propagates errors", async () => {
		const input = { name: "Anh Ba", phone: "0909", type: "FARMER" as const };
		createCustomer(input);
		updateCustomer("customer-1", { name: "Anh Ba mới" });
		expect(mocked).toHaveBeenNthCalledWith(1, "/tenant/customers", {
			method: "POST",
			body: JSON.stringify(input),
		});
		expect(mocked).toHaveBeenNthCalledWith(2, "/tenant/customers/customer-1", {
			method: "PATCH",
			body: JSON.stringify({ name: "Anh Ba mới" }),
		});
		const error = new Error("validation");
		mocked.mockRejectedValueOnce(error);
		await expect(listCustomers()).rejects.toBe(error);
	});
});
