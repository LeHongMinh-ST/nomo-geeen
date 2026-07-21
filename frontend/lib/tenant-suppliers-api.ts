import { userFetch } from "@/lib/user-fetch";
export type TenantSupplier = {
	id: string;
	code: string;
	name: string;
	supplierType: string | null;
	contactName: string | null;
	phone: string | null;
	email: string | null;
	address: string | null;
	taxCode: string | null;
	balance: number;
	status: "ACTIVE" | "INACTIVE";
};
export type SupplierListResponse = {
	items: TenantSupplier[];
	page: number;
	pageSize: number;
	total: number;
};
export type SupplierInput = {
	code: string;
	name: string;
	supplierType?: string;
	contactName?: string;
	phone?: string;
	email?: string;
	address?: string;
	taxCode?: string;
};
const base = "/tenant/suppliers";
const supplierTypeLabels: Record<string, string> = {
	manufacturer: "Nhà sản xuất",
	distributor: "Nhà phân phối",
	agent: "Đại lý",
};

export function supplierTypeLabel(value: string | null) {
	return value ? (supplierTypeLabels[value] ?? value) : "Chưa phân loại";
}
export function listTenantSuppliers(
	params: { page?: number; pageSize?: number; search?: string } = {},
): Promise<SupplierListResponse> {
	const query = new URLSearchParams();
	for (const [key, value] of Object.entries(params))
		if (value !== undefined) query.set(key, String(value));
	return userFetch<SupplierListResponse>(
		query.size ? `${base}?${query.toString()}` : base,
	);
}
export function getTenantSupplier(id: string): Promise<TenantSupplier> {
	return userFetch<TenantSupplier>(`${base}/${id}`);
}
export function createTenantSupplier(
	input: SupplierInput,
): Promise<TenantSupplier> {
	return userFetch<TenantSupplier>(base, {
		method: "POST",
		body: JSON.stringify(input),
	});
}
export function updateTenantSupplier(
	id: string,
	input: Partial<SupplierInput>,
): Promise<TenantSupplier> {
	return userFetch<TenantSupplier>(`${base}/${id}`, {
		method: "PATCH",
		body: JSON.stringify(input),
	});
}
export function deleteTenantSupplier(
	id: string,
): Promise<{ id: string; deleted: boolean }> {
	return userFetch(`${base}/${id}`, { method: "DELETE" });
}
