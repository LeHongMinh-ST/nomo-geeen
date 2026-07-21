import { userFetch } from "@/lib/user-fetch";
export type InventoryListItem = {
	productId: string;
	productName: string;
	sku: string;
	warehouseId: string;
	baseUnitId: string;
	baseUnit: string;
	qty: string;
	avgCost: string;
	updatedAt: string;
	nextExpiry: string | null;
	batches: InventoryBatch[];
};
export type InventoryBatch = {
	id: string;
	batchCode: string;
	expiresAt: string | null;
	qtyOnHand: string;
};
export type InventoryListResponse = {
	items: InventoryListItem[];
	page: number;
	pageSize: number;
	total: number;
};
export type InventoryMovement = {
	id: string;
	productId: string;
	warehouseId: string;
	direction: "IN" | "OUT";
	qty: string;
	unitCost: string | null;
	reason: string;
	refType: string;
	refId: string;
	occurredAt: string;
};
export type InventoryDetail = InventoryListItem & {
	movements: InventoryMovement[];
};
const base = "/tenant/inventory";
export function listTenantInventory(
	params: { page?: number; pageSize?: number; search?: string } = {},
): Promise<InventoryListResponse> {
	const q = new URLSearchParams();
	for (const [k, v] of Object.entries(params))
		if (v !== undefined) q.set(k, String(v));
	return userFetch<InventoryListResponse>(
		q.size ? `${base}?${q.toString()}` : base,
	);
}
export function getTenantInventoryDetail(
	productId: string,
): Promise<InventoryDetail> {
	return userFetch<InventoryDetail>(`${base}/${productId}`);
}
