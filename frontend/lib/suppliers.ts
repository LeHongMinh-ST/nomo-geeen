/**
 * Kiểu dữ liệu + mock cho Nhà cung cấp (base_spec §7).
 * FE-only: dữ liệu mẫu tại chỗ, thay bằng API ở task backend.
 * Id đồng bộ với payables trong [[debts]] (ncc-*) để nối công nợ NCC.
 */

export type SupplierType = "manufacturer" | "distributor" | "agent";

export type Supplier = {
	id: string;
	code: string;
	name: string;
	type: SupplierType;
	contact?: string;
	/** Chức vụ người liên hệ (base_spec §7). */
	contactRole?: string;
	phone: string;
	address?: string;
	/** Mã số thuế — nếu có (base_spec §7). */
	taxCode?: string;
	/** Chính sách hợp tác (tùy chọn, base_spec §7). */
	discountPercent?: number;
	creditLimit?: number;
	paymentTerm?: string;
};

export const supplierTypeLabel: Record<SupplierType, string> = {
	manufacturer: "Nhà sản xuất",
	distributor: "Nhà phân phối",
	agent: "Đại lý cấp trên",
};

export const suppliers: Supplier[] = [
	{
		id: "ncc-binhdien",
		code: "NCC-001",
		name: "Vật tư Bình Điền",
		type: "manufacturer",
		contact: "A. Dũng",
		contactRole: "Trưởng vùng",
		phone: "0283822xxxx",
		address: "KCN Long An",
		taxCode: "0301234567",
		discountPercent: 5,
		creditLimit: 50_000_000,
		paymentTerm: "Công nợ 30 ngày",
	},
	{
		id: "ncc-bayer",
		code: "NCC-002",
		name: "Bayer Việt Nam",
		type: "distributor",
		contact: "C. Lan",
		contactRole: "Nhân viên kinh doanh",
		phone: "0283911xxxx",
		address: "Q.1, TP.HCM",
		taxCode: "0302345678",
		paymentTerm: "Công nợ 15 ngày",
	},
	{
		id: "ncc-loctroi",
		code: "NCC-003",
		name: "Tập đoàn Lộc Trời",
		type: "distributor",
		phone: "0296384xxxx",
		address: "An Giang",
	},
	{
		id: "ncc-syngenta",
		code: "NCC-004",
		name: "Syngenta Việt Nam",
		type: "manufacturer",
		phone: "0283822yyyy",
		address: "Q.1, TP.HCM",
	},
	{
		id: "ncc-cholon",
		code: "NCC-005",
		name: "Đại lý Chợ Lớn",
		type: "agent",
		contact: "A. Bảy",
		phone: "0913777888",
		address: "Q.5, TP.HCM",
	},
];

export function getSupplier(id?: string): Supplier | undefined {
	if (!id) return undefined;
	return suppliers.find((s) => s.id === id);
}

export function supplierName(id?: string): string {
	return getSupplier(id)?.name ?? "—";
}
