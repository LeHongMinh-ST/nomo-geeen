"use client";

import { create } from "zustand";
import type { OrderLine } from "@/lib/orders";

export type QuickSaleHandbookMeta = {
	diseaseId?: string;
	protocolId?: string;
	consultContext?: Record<string, unknown>;
	suggestedProductsMeta?: Array<Record<string, unknown>>;
	suggestedQtyMeta?: Record<string, unknown>;
};

type QuickSaleStore = {
	customerId?: string;
	lines: OrderLine[];
	handbookMeta: QuickSaleHandbookMeta;
	idempotencyKey: string | null;
	setCustomerId: (customerId: string | undefined) => void;
	setLines: (
		lines: OrderLine[] | ((current: OrderLine[]) => OrderLine[]),
	) => void;
	setHandbookMeta: (
		meta:
			| QuickSaleHandbookMeta
			| ((current: QuickSaleHandbookMeta) => QuickSaleHandbookMeta),
	) => void;
	setIdempotencyKey: (key: string | null) => void;
	clearDraft: () => void;
};

const emptyDraft = {
	customerId: undefined,
	lines: [],
	handbookMeta: {},
	idempotencyKey: null,
};

export const useQuickSaleStore = create<QuickSaleStore>((set) => ({
	...emptyDraft,
	setCustomerId: (customerId) => set({ customerId, idempotencyKey: null }),
	setLines: (lines) =>
		set((state) => ({
			lines: typeof lines === "function" ? lines(state.lines) : lines,
			idempotencyKey: null,
		})),
	setHandbookMeta: (meta) =>
		set((state) => ({
			handbookMeta:
				typeof meta === "function" ? meta(state.handbookMeta) : meta,
			idempotencyKey: null,
		})),
	setIdempotencyKey: (idempotencyKey) => set({ idempotencyKey }),
	clearDraft: () => set(emptyDraft),
}));
