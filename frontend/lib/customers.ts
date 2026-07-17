/**
 * Kiểu dữ liệu + mock cho module Khách hàng (base_spec §6).
 * FE-only: dữ liệu mẫu tại chỗ, thay bằng API ở task backend.
 * SĐT là định danh chính khi ghi nợ (nông dân thường không có mã KH).
 */

export type CustomerType = "retail" | "farmer" | "farm" | "agent";

export type Customer = {
	id: string;
	name: string;
	phone: string;
	address?: string;
	type: CustomerType;
	/** Công nợ hiện tại (₫) — dương là khách đang nợ. */
	debt: number;
};

export const customerTypeLabel: Record<CustomerType, string> = {
	retail: "Khách lẻ",
	farmer: "Nông hộ",
	farm: "Trang trại",
	agent: "Đại lý",
};

export const customers: Customer[] = [
	{
		id: "kh1",
		name: "Anh Ba",
		phone: "0912345678",
		address: "Tổ 3, Ấp Bình Thành",
		type: "farmer",
		debt: 1_200_000,
	},
	{
		id: "kh2",
		name: "Chị Tư Hồng",
		phone: "0987654321",
		address: "Chợ Ba Càng",
		type: "retail",
		debt: 0,
	},
	{
		id: "kh3",
		name: "Trang trại Thành Công",
		phone: "0909111222",
		address: "Xã Long Hòa",
		type: "farm",
		debt: 4_850_000,
	},
	{
		id: "kh4",
		name: "Đại lý Hai Lúa",
		phone: "0938222333",
		address: "QL1A, Cai Lậy",
		type: "agent",
		debt: 0,
	},
	{
		id: "kh5",
		name: "Anh Năm Tèo",
		phone: "0977333444",
		address: "Ấp Tân Hưng",
		type: "farmer",
		debt: 320_000,
	},
	{
		id: "kh6",
		name: "Cô Bảy",
		phone: "0916555666",
		type: "retail",
		debt: 0,
	},
];

export function getCustomer(id: string): Customer | undefined {
	return customers.find((c) => c.id === id);
}
