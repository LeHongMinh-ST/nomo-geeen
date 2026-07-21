import { userFetch } from "@/lib/user-fetch";

export type CustomerType = "RETAIL" | "FARMER" | "FARM" | "AGENT";

export type Customer = {
	id: string;
	code: string | null;
	name: string;
	phone: string | null;
	address: string | null;
	note: string | null;
	type: CustomerType | null;
	balance: number;
	openingBalance: number;
	createdAt: string;
	updatedAt: string;
};

export type CustomerListResponse = {
	items: Customer[];
	page: number;
	pageSize: number;
	total: number;
};

export type CustomerInput = {
	name: string;
	phone?: string;
	code?: string;
	address?: string;
	note?: string;
	type?: CustomerType;
};

const base = "/tenant/customers";

function queryString(params: Record<string, string | number | undefined>) {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== "") query.set(key, String(value));
	}
	return query.size ? `?${query.toString()}` : "";
}

export function listCustomers(
	params: { search?: string; page?: number; pageSize?: number } = {},
) {
	return userFetch<CustomerListResponse>(`${base}${queryString(params)}`);
}

export function getCustomer(id: string) {
	return userFetch<Customer>(`${base}/${id}`);
}

export function createCustomer(input: CustomerInput) {
	return userFetch<Customer>(base, {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export function updateCustomer(id: string, input: Partial<CustomerInput>) {
	return userFetch<Customer>(`${base}/${id}`, {
		method: "PATCH",
		body: JSON.stringify(input),
	});
}

export function deleteCustomer(id: string) {
	return userFetch<{ id: string; deleted: boolean }>(`${base}/${id}`, {
		method: "DELETE",
	});
}

export const customerTypeLabel: Record<CustomerType, string> = {
	RETAIL: "Khách lẻ",
	FARMER: "Nông hộ",
	FARM: "Trang trại",
	AGENT: "Đại lý",
};
