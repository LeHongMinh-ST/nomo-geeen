export type InventoryListItem = {
	productId: string;
	productName: string;
	sku: string;
	warehouseId: string;
	baseUnitId: string;
	qty: string;
	avgCost: string;
	updatedAt: string;
};
export type InventoryMovement = {
	id: string;
	productId: string;
	warehouseId: string;
	direction: 'IN' | 'OUT';
	qty: string;
	unitCost: string | null;
	reason:
		| 'PURCHASE'
		| 'SALE'
		| 'SALE_RETURN'
		| 'PURCHASE_RETURN'
		| 'ADJUSTMENT'
		| 'TRANSFER_IN'
		| 'TRANSFER_OUT';
	refType: string;
	refId: string;
	occurredAt: string;
};
