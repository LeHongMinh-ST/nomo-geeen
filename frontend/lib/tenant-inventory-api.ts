import { userFetch } from "@/lib/user-fetch";
/**
 * Expiry tiers are classified server-side (backend expiry-policy.ts) against the
 * 180/90/30 day marks in catalog §5.1. The client never recomputes them.
 */
export type ExpiryTier =
	| "EXPIRED"
	| "CRITICAL"
	| "WARNING"
	| "NOTICE"
	| "FRESH"
	| "NONE";
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
	/** Worst tier across the product's live batches. */
	expiryTier: ExpiryTier;
	batches: InventoryBatch[];
};
export type InventoryBatch = {
	id: string;
	batchCode: string;
	expiresAt: string | null;
	expiryTier: ExpiryTier;
	/** Whole days until expiry; negative once passed, null with no expiry date. */
	daysToExpiry: number | null;
	qtyOnHand: string;
};
/** Tenant-wide inventory warnings (catalog §14.1). */
export type InventoryExpirySummary = {
	generatedAt: string;
	/** Closed tier set, worst first. */
	tiers: ExpiryTier[];
	thresholdDays: { critical: number; warning: number; notice: number };
	batches: { total: number; byTier: Record<ExpiryTier, number> };
	/** Each stock row counted once, under the worst tier among its batches. */
	items: { total: number; byTier: Record<ExpiryTier, number> };
	recalledBatches: number;
	recalledItems: number;
	inactiveItems: number;
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
export function getTenantInventoryExpirySummary(): Promise<InventoryExpirySummary> {
	return userFetch<InventoryExpirySummary>(`${base}/expiry-summary`);
}
