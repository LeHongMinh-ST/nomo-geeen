import { userFetch } from "@/lib/user-fetch";

export type QuickSaleDraftLine = {
	id: string;
	productId: string;
	productName: string;
	unitId: string;
	unitName: string;
	qty: number;
	unitPrice: number;
	lineTotal: number;
	addedByUserId: string | null;
};

export type QuickSaleDraft = {
	id: string;
	tenantId: string;
	ownerUserId: string;
	joinToken: string;
	customerId: string | null;
	warehouseId: string | null;
	handbookMeta: Record<string, unknown> | null;
	expiresAt: string;
	lastTouchedAt: string;
	closedAt: string | null;
	createdAt: string;
	updatedAt: string;
	subtotal: number;
	itemCount: number;
	total: number;
	lines: QuickSaleDraftLine[];
};

export type QuickSaleDraftResponse = QuickSaleDraft;

export type AddQuickSaleDraftLineInput = {
	productId: string;
	unitId: string;
	qty: number;
	unitPrice: number;
	idempotencyKey: string;
};

export type SetLineQuantityInput = {
	qty: number;
	unitPrice?: number;
	idempotencyKey: string;
};

export type CheckoutQuickSaleDraftInput = {
	idempotencyKey: string;
	paymentMethod: "CASH" | "TRANSFER" | "QR" | "DEBT";
	amountPaid: number;
	discountAmount?: number;
};

export type PatchQuickSaleDraftInput = {
	idempotencyKey: string;
	customerId?: string;
	clearCustomer?: boolean;
};

const base = "/tenant/sales/quick-draft";

export function getCurrentDraft(): Promise<QuickSaleDraftResponse | null> {
	return userFetch<QuickSaleDraftResponse | null>(`${base}/current`);
}

export function createDraft(): Promise<QuickSaleDraftResponse> {
	return userFetch<QuickSaleDraftResponse>(base, {
		method: "POST",
		body: JSON.stringify({}),
	});
}

export function joinDraft(
	joinToken: string,
): Promise<
	QuickSaleDraftResponse | { error: { reason: string; message: string } }
> {
	return userFetch<
		QuickSaleDraftResponse | { error: { reason: string; message: string } }
	>(`${base}/join`, {
		method: "POST",
		body: JSON.stringify({ joinToken }),
	});
}

export function addDraftLine(
	draftId: string,
	input: AddQuickSaleDraftLineInput,
): Promise<QuickSaleDraftResponse> {
	return userFetch<QuickSaleDraftResponse>(`${base}/${draftId}/lines`, {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export function setLineQuantity(
	draftId: string,
	productId: string,
	input: SetLineQuantityInput,
): Promise<QuickSaleDraftResponse> {
	return userFetch<QuickSaleDraftResponse>(
		`${base}/${draftId}/lines/${productId}`,
		{
			method: "PATCH",
			body: JSON.stringify(input),
		},
	);
}

export function removeDraftLine(
	draftId: string,
	productId: string,
	idempotencyKey: string,
): Promise<QuickSaleDraftResponse> {
	return userFetch<QuickSaleDraftResponse>(
		`${base}/${draftId}/lines/${productId}`,
		{
			method: "DELETE",
			body: JSON.stringify({ idempotencyKey }),
		},
	);
}

export function patchDraftCustomer(
	draftId: string,
	input: PatchQuickSaleDraftInput,
): Promise<QuickSaleDraftResponse> {
	return userFetch<QuickSaleDraftResponse>(`${base}/${draftId}`, {
		method: "PATCH",
		body: JSON.stringify(input),
	});
}

export function checkoutDraft(
	draftId: string,
	input: CheckoutQuickSaleDraftInput,
): Promise<{
	id: string;
	docNo: string;
	status: "COMPLETED";
	total: number;
	changeAmount: number;
	debtAmount: number;
	paymentMethod: "CASH" | "TRANSFER" | "QR" | "DEBT";
}> {
	return userFetch(`${base}/${draftId}/checkout`, {
		method: "POST",
		body: JSON.stringify(input),
	});
}

export function closeDraft(
	draftId: string,
): Promise<{ id: string; closed: true }> {
	return userFetch(`${base}/${draftId}`, {
		method: "DELETE",
		body: JSON.stringify({}),
	});
}
