/**
 * Kiểu dữ liệu + mock cho Nhập hàng (base_spec §8 Purchase).
 * FE-only: dữ liệu mẫu tại chỗ, thay bằng API ở task backend.
 * Simple Mode: phiếu nhập một bước — Draft / Completed / Cancelled.
 * Hoàn thành thì cộng tồn; nhập theo đơn vị lớn tự quy đổi ra Base Unit (§5.1).
 */

import { getProduct, products } from "./products";
import { getSupplier } from "./suppliers";

export type PurchaseStatus = "draft" | "completed" | "cancelled";

/** Hình thức thanh toán NCC (base_spec §12). */
export type PurchasePayment = "cash" | "transfer" | "debt";

/** Một dòng hàng trong phiếu nhập. */
export type PurchaseLine = {
	productId: string;
	unitId?: string;
	name: string;
	/** Đơn vị nhập (có thể là đơn vị lớn: Thùng, Bao...). */
	unit: string;
	/** Số Base Unit tương ứng 1 đơn vị nhập (quy đổi §5.1). */
	factor: number;
	/** Số lượng theo đơn vị nhập. */
	qty: number;
	/** Giá vốn (₫) trên 1 đơn vị nhập. */
	cost: number;
	/** Số lô (batch) — tùy chọn. */
	batch?: string;
	/** Hạn sử dụng ISO (YYYY-MM-DD) — tùy chọn. */
	expiry?: string;
};

export type Purchase = {
	id: string;
	idempotencyKey?: string;
	/** Mã phiếu nhập hiển thị (PN-0031). */
	code: string;
	supplierId: string;
	supplierName?: string;
	lines: PurchaseLine[];
	/** Chiết khấu tuyệt đối (₫). */
	discount: number;
	/** Chi phí vận chuyển (₫). */
	shipping: number;
	status: PurchaseStatus;
	payment: PurchasePayment;
	/** Ngày nhập ISO (YYYY-MM-DD). */
	createdAt: string;
	note?: string;
};

export const purchaseStatusLabel: Record<PurchaseStatus, string> = {
	draft: "Nháp",
	completed: "Hoàn thành",
	cancelled: "Đã hủy",
};

/** Class badge trạng thái phiếu (DESIGN.md §13). */
export const purchaseStatusBadgeClass: Record<PurchaseStatus, string> = {
	draft: "bg-[#f5f5f5] text-[#616161]",
	completed: "bg-[#e8f5e9] text-[#2e7d32]",
	cancelled: "bg-[#ffebee] text-[#c62828]",
};

export const purchasePaymentLabel: Record<PurchasePayment, string> = {
	cash: "Tiền mặt",
	transfer: "Chuyển khoản",
	debt: "Ghi nợ",
};

export function purchaseLineTotal(line: PurchaseLine): number {
	return line.qty * line.cost;
}

/** Tổng số Base Unit dòng nhập cộng vào tồn (qty × factor). */
export function purchaseLineBaseQty(line: PurchaseLine): number {
	return line.qty * line.factor;
}

export function purchaseSubtotal(p: Pick<Purchase, "lines">): number {
	return p.lines.reduce((sum, l) => sum + purchaseLineTotal(l), 0);
}

export function purchaseTotal(
	p: Pick<Purchase, "lines" | "discount" | "shipping">,
): number {
	return Math.max(0, purchaseSubtotal(p) - p.discount + p.shipping);
}

export function purchaseItemCount(p: Pick<Purchase, "lines">): number {
	return p.lines.length;
}

export function supplierLabel(
	p: Pick<Purchase, "supplierId" | "supplierName">,
): string {
	return p.supplierName ?? getSupplier(p.supplierId)?.name ?? "—";
}

/* Tạo dòng nhập mẫu từ catalog. */
function line(
	productId: string,
	unit: string,
	factor: number,
	qty: number,
	cost: number,
	extra?: { batch?: string; expiry?: string },
): PurchaseLine {
	const p = getProduct(productId) ?? products[0];
	return {
		productId: p.id,
		name: p.name,
		unit,
		factor,
		qty,
		cost,
		batch: extra?.batch,
		expiry: extra?.expiry,
	};
}

export const purchases: Purchase[] = [
	{
		id: "pn1",
		code: "PN-0035",
		supplierId: "ncc-loctroi",
		lines: [
			line("p3", "Bao", 40, 20, 780_000, {
				batch: "OM5451-0724",
				expiry: "2027-01-15",
			}),
			line("p1", "Bao", 50, 30, 880_000),
		],
		discount: 0,
		shipping: 200_000,
		status: "completed",
		payment: "debt",
		createdAt: "2026-07-11",
		note: "Giao tận kho",
	},
	{
		id: "pn2",
		code: "PN-0034",
		supplierId: "ncc-bayer",
		lines: [
			line("p2", "Thùng", 100, 8, 1_150_000, {
				batch: "RG800-0625",
				expiry: "2026-08-30",
			}),
		],
		discount: 100_000,
		shipping: 0,
		status: "completed",
		payment: "transfer",
		createdAt: "2026-07-05",
	},
	{
		id: "pn3",
		code: "PN-0033",
		supplierId: "ncc-binhdien",
		lines: [
			line("p1", "Bao", 50, 40, 850_000),
			line("p5", "Bao", 25, 60, 55_000),
		],
		discount: 0,
		shipping: 300_000,
		status: "completed",
		payment: "cash",
		createdAt: "2026-07-03",
	},
	{
		id: "pn4",
		code: "PN-0032",
		supplierId: "ncc-syngenta",
		lines: [
			line("p4", "Thùng", 12, 10, 620_000, {
				batch: "GRA20-0524",
				expiry: "2026-07-25",
			}),
		],
		discount: 0,
		shipping: 0,
		status: "draft",
		payment: "cash",
		createdAt: "2026-07-14",
	},
	{
		id: "pn5",
		code: "PN-0031",
		supplierId: "ncc-cholon",
		lines: [line("p5", "Bao", 25, 40, 52_000)],
		discount: 0,
		shipping: 150_000,
		status: "cancelled",
		payment: "cash",
		createdAt: "2026-06-28",
	},
];

export function getPurchase(id: string): Purchase | undefined {
	return purchases.find((p) => p.id === id);
}
