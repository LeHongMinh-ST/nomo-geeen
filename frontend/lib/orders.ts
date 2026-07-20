/**
 * Kiểu dữ liệu + mock cho module Đơn bán hàng (base_spec §10 Sales, §11 Pricing).
 * FE-only: dữ liệu mẫu tại chỗ, thay bằng API ở task backend.
 * Simple Mode: trạng thái Draft / Completed / Cancelled.
 */

import { getCustomer } from "./customers";
import { getProduct, type Product, products } from "./products";

export type OrderStatus = "draft" | "completed" | "cancelled";

/** Hình thức thanh toán (base_spec §12). */
export type PaymentMethod = "cash" | "transfer" | "qr" | "debt";

/** Một dòng hàng trong đơn / giỏ bán nhanh. */
export type OrderLine = {
	productId: string;
	unitId?: string;
	name: string;
	unit: string;
	qty: number;
	/** Đơn giá đã áp (₫) — có thể sửa tay. */
	price: number;
};

export type Order = {
	id: string;
	/** Mã đơn hiển thị (DH-0001). */
	code: string;
	customerId?: string;
	lines: OrderLine[];
	/** Chiết khấu tuyệt đối (₫). */
	discount: number;
	status: OrderStatus;
	payment: PaymentMethod;
	/** Ngày tạo dạng ISO (YYYY-MM-DD). */
	createdAt: string;
	note?: string;
};

export const orderStatusLabel: Record<OrderStatus, string> = {
	draft: "Nháp",
	completed: "Hoàn thành",
	cancelled: "Đã hủy",
};

/** Class badge trạng thái đơn (DESIGN.md §13 — nền + chữ, không chỉ màu). */
export const orderStatusBadgeClass: Record<OrderStatus, string> = {
	draft: "bg-[#f5f5f5] text-[#616161]",
	completed: "bg-[#e8f5e9] text-[#2e7d32]",
	cancelled: "bg-[#ffebee] text-[#c62828]",
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
	cash: "Tiền mặt",
	transfer: "Chuyển khoản",
	qr: "Quét QR",
	debt: "Ghi nợ",
};

/**
 * Áp giá theo bậc số lượng (base_spec §11).
 * Chọn bậc có minQty lớn nhất mà qty vẫn đạt; mặc định salePrice khi chưa cấu hình.
 */
export function resolveTierPrice(product: Product, qty: number): number {
	if (!product.priceTiers.length) return product.salePrice;
	let price = product.priceTiers[0].price;
	for (const tier of product.priceTiers) {
		if (qty >= tier.minQty) price = tier.price;
	}
	return price;
}

export function lineTotal(line: OrderLine): number {
	return line.qty * line.price;
}

/**
 * Giá mới cho dòng hàng khi đổi số lượng (base_spec §11 — tự áp giá bậc).
 * Giữ nguyên nếu người bán đã sửa giá tay (khác giá bậc của số lượng cũ).
 */
export function repriceLine(line: OrderLine, newQty: number): number {
	const product = getProduct(line.productId);
	if (!product) return line.price;
	const oldTierPrice = resolveTierPrice(product, line.qty);
	if (line.price !== oldTierPrice) return line.price;
	return resolveTierPrice(product, newQty);
}

export function orderSubtotal(order: Pick<Order, "lines">): number {
	return order.lines.reduce((sum, l) => sum + lineTotal(l), 0);
}

export function orderTotal(order: Pick<Order, "lines" | "discount">): number {
	return Math.max(0, orderSubtotal(order) - order.discount);
}

export function orderItemCount(order: Pick<Order, "lines">): number {
	return order.lines.reduce((sum, l) => sum + l.qty, 0);
}

export function customerLabel(order: Pick<Order, "customerId">): string {
	if (!order.customerId) return "Khách lẻ";
	return getCustomer(order.customerId)?.name ?? "Khách lẻ";
}

/* Tạo vài dòng hàng mẫu từ catalog để mock đơn. */
function line(productId: string, qty: number): OrderLine {
	const p = getProduct(productId) ?? products[0];
	return {
		productId: p.id,
		name: p.name,
		unit: p.baseUnit,
		qty,
		price: resolveTierPrice(p, qty),
	};
}

export const orders: Order[] = [
	{
		id: "o1",
		code: "DH-0007",
		customerId: "kh1",
		lines: [line("p1", 100), line("p2", 5)],
		discount: 0,
		status: "completed",
		payment: "cash",
		createdAt: "2026-07-17",
	},
	{
		id: "o2",
		code: "DH-0006",
		customerId: "kh3",
		lines: [line("p4", 12), line("p5", 50)],
		discount: 50_000,
		status: "completed",
		payment: "debt",
		createdAt: "2026-07-16",
		note: "Giao tận trang trại chiều thứ 6",
	},
	{
		id: "o3",
		code: "DH-0005",
		lines: [line("p5", 25)],
		discount: 0,
		status: "completed",
		payment: "transfer",
		createdAt: "2026-07-16",
	},
	{
		id: "o4",
		code: "DH-0004",
		customerId: "kh5",
		lines: [line("p1", 200), line("p4", 24)],
		discount: 0,
		status: "draft",
		payment: "cash",
		createdAt: "2026-07-15",
	},
	{
		id: "o5",
		code: "DH-0003",
		customerId: "kh2",
		lines: [line("p2", 100)],
		discount: 100_000,
		status: "completed",
		payment: "qr",
		createdAt: "2026-07-14",
	},
	{
		id: "o6",
		code: "DH-0002",
		lines: [line("p5", 10)],
		discount: 0,
		status: "cancelled",
		payment: "cash",
		createdAt: "2026-07-13",
	},
	{
		id: "o7",
		code: "DH-0001",
		customerId: "kh1",
		lines: [line("p1", 50), line("p2", 2), line("p5", 25)],
		discount: 20_000,
		status: "completed",
		payment: "cash",
		createdAt: "2026-07-12",
	},
];

export function getOrder(id: string): Order | undefined {
	return orders.find((o) => o.id === id);
}
