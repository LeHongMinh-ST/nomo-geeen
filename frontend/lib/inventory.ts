/**
 * Kiểu dữ liệu + mock cho Tồn kho (base_spec §9 Inventory).
 * FE-only: dữ liệu mẫu tại chỗ, thay bằng API ở task backend.
 * Simple Mode: một kho duy nhất. Theo dõi lô (batch) + HSD; cảnh báo sắp/đã hết hạn.
 * Trạng thái HSD tính theo TODAY cố định để không lệch server/client (hydrate).
 */

import {
	getProduct,
	getStockStatus,
	type Product,
	products,
	type StockStatus,
	stockStatusBadgeClass,
	stockStatusLabel,
} from "./products";

/** Mốc "hôm nay" cố định cho mock — khớp docs/currentDate và [[debts]]. */
export const TODAY = "2026-07-17";

/** Ngưỡng cảnh báo sắp hết hạn (ngày). */
export const EXPIRY_SOON_DAYS = 60;

export type ExpiryStatus = "fresh" | "expiring" | "expired" | "none";

/** Một lô hàng của sản phẩm (batch). */
export type Batch = {
	id: string;
	/** Số lô. */
	code: string;
	/** Số lượng còn lại theo Base Unit. */
	qty: number;
	/** Hạn sử dụng ISO (YYYY-MM-DD). */
	expiry?: string;
};

/** Một lần điều chỉnh tồn (kiểm kê / lệch thực tế). */
export type Adjustment = {
	id: string;
	date: string;
	/** Chênh lệch (Base Unit): dương = tăng, âm = giảm. */
	delta: number;
	reason: string;
};

export type InventoryItem = {
	productId: string;
	batches: Batch[];
	adjustments: Adjustment[];
};

/** Số ngày còn lại tới HSD (âm nếu đã quá hạn). */
export function daysToExpiry(expiry: string): number {
	const a = Date.parse(`${TODAY}T00:00:00Z`);
	const b = Date.parse(`${expiry}T00:00:00Z`);
	return Math.round((b - a) / 86_400_000);
}

export function expiryStatusOf(expiry?: string): ExpiryStatus {
	if (!expiry) return "none";
	const d = daysToExpiry(expiry);
	if (d < 0) return "expired";
	if (d <= EXPIRY_SOON_DAYS) return "expiring";
	return "fresh";
}

export const expiryStatusLabel: Record<ExpiryStatus, string> = {
	fresh: "Còn hạn",
	expiring: "Sắp hết hạn",
	expired: "Đã hết hạn",
	none: "Không HSD",
};

export const expiryStatusBadgeClass: Record<ExpiryStatus, string> = {
	fresh: "bg-[#e8f5e9] text-[#2e7d32]",
	expiring: "bg-[#fff8e1] text-[#f57f17]",
	expired: "bg-[#ffebee] text-[#c62828]",
	none: "bg-[#f5f5f5] text-[#616161]",
};

/** HSD gần nhất trong các lô (để hiển thị + cảnh báo ở dòng tồn). */
export function earliestExpiry(item: InventoryItem): string | undefined {
	const dated = item.batches
		.filter((b) => b.expiry)
		.map((b) => b.expiry as string)
		.sort();
	return dated[0];
}

/** Trạng thái HSD tổng hợp của một mặt hàng (lô xấu nhất). */
export function itemExpiryStatus(item: InventoryItem): ExpiryStatus {
	let worst: ExpiryStatus = "none";
	const rank: Record<ExpiryStatus, number> = {
		none: 0,
		fresh: 1,
		expiring: 2,
		expired: 3,
	};
	for (const b of item.batches) {
		const s = expiryStatusOf(b.expiry);
		if (rank[s] > rank[worst]) worst = s;
	}
	return worst;
}

/** Giá trị tồn (₫) theo giá vốn Base Unit. */
export function stockValue(product: Product): number {
	return product.stock * product.costPrice;
}

/* Mock lô + điều chỉnh cho một số sản phẩm; sản phẩm khác coi như 1 lô không HSD. */
const seeds: Record<string, Omit<InventoryItem, "productId">> = {
	p2: {
		batches: [
			{ id: "b-p2-1", code: "RG800-0625", qty: 24, expiry: "2026-08-30" },
		],
		adjustments: [
			{
				id: "adj1",
				date: "2026-07-10",
				delta: -2,
				reason: "Vỡ khi vận chuyển",
			},
		],
	},
	p4: {
		batches: [
			{ id: "b-p4-1", code: "GRA20-0524", qty: 120, expiry: "2026-07-25" },
			{ id: "b-p4-2", code: "GRA20-0824", qty: 36, expiry: "2027-02-10" },
		],
		adjustments: [],
	},
	p3: {
		batches: [
			{ id: "b-p3-1", code: "OM5451-0724", qty: 0, expiry: "2027-01-15" },
		],
		adjustments: [
			{ id: "adj2", date: "2026-07-08", delta: -8, reason: "Kiểm kê lệch" },
		],
	},
	p6: {
		batches: [
			{ id: "b-p6-1", code: "VIME-0324", qty: 12, expiry: "2026-06-30" },
		],
		adjustments: [],
	},
};

export const inventory: InventoryItem[] = products.map((p) => {
	const seed = seeds[p.id];
	if (seed) return { productId: p.id, ...seed };
	// Mặc định: gộp toàn bộ tồn vào 1 lô không HSD.
	return {
		productId: p.id,
		batches: [{ id: `b-${p.id}`, code: "—", qty: p.stock }],
		adjustments: [],
	};
});

export function getInventory(productId: string): InventoryItem | undefined {
	return inventory.find((i) => i.productId === productId);
}

export type { Product, StockStatus };
/* Re-export tiện dùng chung ở component tồn kho. */
export {
	getProduct,
	getStockStatus,
	products,
	stockStatusBadgeClass,
	stockStatusLabel,
};
