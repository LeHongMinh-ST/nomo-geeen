/**
 * Kiểu dữ liệu + mock cho module Sản phẩm (base_spec §5, §5.1, §11).
 * FE-only: dữ liệu mẫu tại chỗ, thay bằng API ở task backend.
 */

export type StockStatus = "in-stock" | "low-stock" | "out-of-stock";

/** Đơn vị quy đổi ra Base Unit (base_spec §5.1). */
export type UnitConversion = {
	/** Tên đơn vị (Thùng, Bao, Chai...). */
	unit: string;
	/** Số Base Unit tương ứng 1 đơn vị này. */
	factor: number;
};

/** Bậc giá theo số lượng (base_spec §11). */
export type PriceTier = {
	/** Số lượng tối thiểu áp bậc giá này. */
	minQty: number;
	/** Đơn giá (₫) trên Base Unit. */
	price: number;
};

/** Thông tin chuyên ngành vật tư nông nghiệp (base_spec §5). */
export type AgroInfo = {
	activeIngredient?: string;
	concentration?: string;
	crop?: string;
	pest?: string;
	/** Thời gian cách ly (ngày) — Pre-Harvest Interval. */
	phi?: number;
	/** Thời gian cách ly khi vào lại khu vực (giờ) — Re-Entry Interval. */
	rei?: number;
};

export type Product = {
	id: string;
	name: string;
	sku: string;
	barcode?: string;
	categoryId: string;
	brandId?: string;
	supplierId?: string;
	manufacturerId?: string;
	/** Đơn vị tồn kho gốc (base_spec §5.1). */
	baseUnit: string;
	baseUnitId?: string;
	categoryLabel?: string;
	brandLabel?: string;
	manufacturerLabel?: string;
	/** Các đơn vị nhập/bán quy đổi ra Base Unit. */
	conversions: UnitConversion[];
	costPrice: number;
	salePrice: number;
	wholesalePrice?: number;
	/** Bậc giá theo số lượng (bật/tắt theo sản phẩm). */
	priceTiers: PriceTier[];
	/** Tồn kho theo Base Unit. */
	stock: number;
	/** Runtime status from the tenant product API; seed products omit it. */
	status?: "active" | "inactive";
	recalled?: boolean;
	/** Ngưỡng cảnh báo sắp hết. */
	lowStockThreshold: number;
	agro?: AgroInfo;
	locked?: boolean;
};

export type Category = { id: string; name: string };
export type Brand = { id: string; name: string };
export type Unit = { id: string; name: string };
export type Manufacturer = { id: string; name: string };

export const categories: Category[] = [
	{ id: "c1", name: "Thuốc BVTV" },
	{ id: "c2", name: "Phân bón" },
	{ id: "c3", name: "Giống cây trồng" },
	{ id: "c4", name: "Thuốc thú y" },
	{ id: "c5", name: "Thức ăn chăn nuôi" },
];

export const brands: Brand[] = [
	{ id: "b1", name: "Đầu Trâu" },
	{ id: "b2", name: "Bayer" },
	{ id: "b3", name: "Syngenta" },
	{ id: "b4", name: "Lộc Trời" },
];

export const units: Unit[] = [
	{ id: "u1", name: "Chai" },
	{ id: "u2", name: "Gói" },
	{ id: "u3", name: "Kg" },
	{ id: "u4", name: "Bao" },
	{ id: "u5", name: "Thùng" },
	{ id: "u6", name: "Lít" },
];

export const manufacturers: Manufacturer[] = [
	{ id: "m1", name: "Công ty CP Bình Điền" },
	{ id: "m2", name: "Bayer Vietnam" },
	{ id: "m3", name: "Syngenta Vietnam" },
];

const catalogSeed: Product[] = [
	{
		id: "p1",
		name: "Phân bón NPK Đầu Trâu 20-20-15",
		sku: "NPK-202015",
		barcode: "8938501234567",
		categoryId: "c2",
		brandId: "b1",
		supplierId: "s1",
		manufacturerId: "m1",
		baseUnit: "Kg",
		conversions: [{ unit: "Bao", factor: 50 }],
		costPrice: 18_000,
		salePrice: 25_000,
		wholesalePrice: 22_000,
		priceTiers: [
			{ minQty: 1, price: 25_000 },
			{ minQty: 50, price: 22_000 },
			{ minQty: 200, price: 20_000 },
		],
		stock: 640,
		lowStockThreshold: 100,
	},
	{
		id: "p2",
		name: "Thuốc trừ sâu Regent 800WG",
		sku: "REGENT-800",
		barcode: "8934567890123",
		categoryId: "c1",
		brandId: "b2",
		supplierId: "s2",
		manufacturerId: "m2",
		baseUnit: "Gói",
		conversions: [{ unit: "Thùng", factor: 100 }],
		costPrice: 12_000,
		salePrice: 18_000,
		wholesalePrice: 15_500,
		priceTiers: [
			{ minQty: 1, price: 18_000 },
			{ minQty: 100, price: 15_500 },
		],
		stock: 24,
		lowStockThreshold: 30,
		agro: {
			activeIngredient: "Fipronil",
			concentration: "800 g/kg",
			crop: "Lúa",
			pest: "Rầy nâu, sâu cuốn lá",
			phi: 7,
			rei: 24,
		},
	},
	{
		id: "p3",
		name: "Hạt giống lúa OM5451",
		sku: "LUA-OM5451",
		categoryId: "c3",
		brandId: "b4",
		supplierId: "s1",
		baseUnit: "Kg",
		conversions: [{ unit: "Bao", factor: 40 }],
		costPrice: 20_000,
		salePrice: 28_000,
		priceTiers: [{ minQty: 1, price: 28_000 }],
		stock: 0,
		lowStockThreshold: 20,
	},
	{
		id: "p4",
		name: "Thuốc trừ cỏ Gramoxone 20SL",
		sku: "GRAMO-20SL",
		barcode: "8935123456780",
		categoryId: "c1",
		brandId: "b3",
		supplierId: "s2",
		manufacturerId: "m3",
		baseUnit: "Chai",
		conversions: [{ unit: "Thùng", factor: 12 }],
		costPrice: 45_000,
		salePrice: 62_000,
		wholesalePrice: 56_000,
		priceTiers: [
			{ minQty: 1, price: 62_000 },
			{ minQty: 12, price: 56_000 },
		],
		stock: 156,
		lowStockThreshold: 24,
		agro: {
			activeIngredient: "Paraquat",
			concentration: "200 g/l",
			crop: "Cây trồng cạn",
			pest: "Cỏ dại",
			phi: 14,
			rei: 48,
		},
	},
	{
		id: "p5",
		name: "Vôi bột nông nghiệp",
		sku: "VOI-BOT",
		categoryId: "c2",
		baseUnit: "Kg",
		conversions: [{ unit: "Bao", factor: 25 }],
		costPrice: 2_500,
		salePrice: 4_000,
		priceTiers: [{ minQty: 1, price: 4_000 }],
		stock: 480,
		lowStockThreshold: 100,
	},
	{
		id: "p6",
		name: "Thuốc thú y Vime-Clostox",
		sku: "VIME-CLOS",
		categoryId: "c4",
		brandId: "b2",
		baseUnit: "Lọ",
		conversions: [{ unit: "Hộp", factor: 10 }],
		costPrice: 35_000,
		salePrice: 48_000,
		priceTiers: [{ minQty: 1, price: 48_000 }],
		stock: 12,
		lowStockThreshold: 15,
		locked: true,
	},
];

/* Thêm sản phẩm demo để minh họa phân trang (desktop) + tải dần khi cuộn (mobile). */
const demoNames = [
	"Phân bón lá Grow More 30-10-10",
	"Thuốc trừ bệnh Anvil 5SC",
	"Hạt giống bắp NK7328",
	"Thức ăn heo con Con Cò C14",
	"Thuốc trừ sâu Actara 25WG",
	"Phân Ure Cà Mau",
	"Thuốc kích rễ N3M",
	"Hạt giống dưa leo TN166",
	"Thuốc thú y Ivermectin 1%",
	"Phân Kali Clorua (MOP)",
	"Thuốc trừ ốc Bolis 6GB",
	"Cám gà đẻ Hi-Gro",
	"Thuốc trừ nấm Ridomil Gold 68WG",
	"Hạt giống ớt hiểm lai F1",
	"Phân bón hữu cơ Sông Gianh",
	"Thuốc sát trùng chuồng trại Benkocid",
];

const demoCats = ["c2", "c1", "c3", "c5", "c1"];
const demoBrands = ["b1", "b2", "b3", "b4", undefined];
const demoUnits = ["Kg", "Chai", "Gói", "Bao", "Lít"];
const demoStocks = [0, 9, 18, 75, 240, 6, 330];

const extraProducts: Product[] = demoNames.map((name, i) => {
	const n = i + 7;
	const baseUnit = demoUnits[i % demoUnits.length];
	const salePrice = 12_000 + (i % 9) * 6_500;
	const stock = demoStocks[i % demoStocks.length];
	return {
		id: `p${n}`,
		name,
		sku: `SP-${String(n).padStart(3, "0")}`,
		categoryId: demoCats[i % demoCats.length],
		brandId: demoBrands[i % demoBrands.length],
		baseUnit,
		conversions: [{ unit: "Thùng", factor: 12 }],
		costPrice: Math.round(salePrice * 0.72),
		salePrice,
		priceTiers: [{ minQty: 1, price: salePrice }],
		stock,
		lowStockThreshold: 12,
	};
});

export const products: Product[] = [...catalogSeed, ...extraProducts];

export function getStockStatus(product: Product): StockStatus {
	if (product.stock <= 0) return "out-of-stock";
	if (product.stock <= product.lowStockThreshold) return "low-stock";
	return "in-stock";
}

export const stockStatusLabel: Record<StockStatus, string> = {
	"in-stock": "Còn hàng",
	"low-stock": "Sắp hết",
	"out-of-stock": "Hết hàng",
};

/** Class badge trạng thái tồn (DESIGN.md §13 — nền + chữ, không chỉ màu). */
export const stockStatusBadgeClass: Record<StockStatus, string> = {
	"in-stock": "bg-[#e8f5e9] text-[#2e7d32]",
	"low-stock": "bg-[#fff8e1] text-[#f57f17]",
	"out-of-stock": "bg-[#ffebee] text-[#c62828]",
};

export function categoryName(id: string): string {
	return categories.find((c) => c.id === id)?.name ?? "—";
}

export function brandName(id?: string): string {
	if (!id) return "—";
	return brands.find((b) => b.id === id)?.name ?? "—";
}

export function getProduct(id: string): Product | undefined {
	return products.find((p) => p.id === id);
}

/** Tra sản phẩm theo mã vạch (dùng cho quét/nhập barcode). */
export function getProductByBarcode(code: string): Product | undefined {
	const c = code.trim();
	if (!c) return undefined;
	return products.find((p) => p.barcode === c);
}
