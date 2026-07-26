// Seed DEMO: nhieu cua hang + user (owner/manager/staff) + san pham nong nghiep + ton kho.
// Chay: pnpm db:seed:demo   (yeu cau da chay `pnpm db:seed` truoc de co system role templates).
//
// Idempotent hoan toan (chay lai nhieu lan an toan):
//   - tenant moi  -> tao trong 1 transaction theo invariant TenantsService.provision:
//                    tenant -> 3 role (OWNER/MANAGER/STAFF, grants clone tu system role tenantId=null) -> OWNER user.
//   - tenant da co -> giu nguyen, chi bo sung user/unit/kho/danh muc/san pham con thieu (upsert).
//   - user upsert theo (tenantId, username): KHONG ghi de passwordHash cu.
//   - unit/warehouse upsert theo (tenantId, code); product upsert theo (tenantId, sku); stock theo (warehouseId, productId).
//
// Argon2id khop PasswordService (src/platform/auth/password.service.ts).

import { PrismaPg } from '@prisma/adapter-pg';
import { type Prisma, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import {
	normalizeSearchList,
	normalizeVietnameseSearch,
} from '../src/platform/handbook/vietnamese-search';

process.loadEnvFile?.('.env');

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const ARGON2_OPTS: argon2.Options = {
	type: argon2.argon2id,
	memoryCost: 65536,
	timeCost: 3,
	parallelism: 2,
};

// Mat khau chung cho user demo: >=12 ky tu, co chu + so + ky tu dac biet (PASSWORD_PATTERN).
const DEMO_PASSWORD = process.env.SEED_DEMO_PASSWORD ?? 'MatKhau@2026';

const PER_TENANT_ROLES = [
	{ code: 'OWNER', name: 'Chủ cửa hàng', rank: 1 },
	{ code: 'MANAGER', name: 'Quản lý', rank: 2 },
	{ code: 'STAFF', name: 'Nhân viên', rank: 3 },
] as const;

type RoleCode = (typeof PER_TENANT_ROLES)[number]['code'];

interface DemoUser {
	username: string;
	role: RoleCode;
	fullName: string;
	email: string;
	phone: string;
}

interface DemoTenant {
	slug: string;
	name: string;
	tenantType: 'HOUSEHOLD' | 'RETAIL_DEALER';
	users: DemoUser[];
	productSkus?: readonly string[];
}

// 3 cua hang demo. Owner = user dau tien (dung de provision khi tenant chua ton tai).
const TENANTS: DemoTenant[] = [
	{
		slug: 'nong-xanh',
		name: 'Cửa hàng Nông Xanh',
		tenantType: 'HOUSEHOLD',
		users: [
			{
				username: 'chutam',
				role: 'OWNER',
				fullName: 'Anh Tâm',
				email: 'chutam@nongxanh.vn',
				phone: '0909123456',
			},
			{
				username: 'quanly.nx',
				role: 'MANAGER',
				fullName: 'Chị Lan',
				email: 'lan@nongxanh.vn',
				phone: '0909123457',
			},
			{
				username: 'nhanvien.nx',
				role: 'STAFF',
				fullName: 'Em Hùng',
				email: 'hung@nongxanh.vn',
				phone: '0909123458',
			},
		],
	},
	{
		slug: 'nong-xanh-bvtv',
		name: 'Đại lý Thuốc BVTV Nông Xanh',
		tenantType: 'RETAIL_DEALER',
		productSkus: ['TBV-001', 'TBV-002', 'TBV-003', 'TBV-004', 'TBV-005', 'TBV-006', 'TBV-007', 'TBV-008', 'TBV-009', 'TBV-010', 'TBV-011', 'TBV-012', 'TBV-013', 'TBV-014', 'TBV-015', 'TBV-016', 'TBV-017', 'TBV-018', 'PB-001', 'PB-002', 'PB-003', 'PB-004', 'PB-005', 'PB-006', 'PB-007', 'PB-008'],
		users: [
			{ username: 'chubvtv', role: 'OWNER', fullName: 'Anh Minh', email: 'minh@nongxanhbvtv.vn', phone: '0914000001' },
			{ username: 'quanly.bvtv', role: 'MANAGER', fullName: 'Chị Hạnh', email: 'hanh@nongxanhbvtv.vn', phone: '0914000002' },
			{ username: 'nhanvien.bvtv', role: 'STAFF', fullName: 'Anh Phúc', email: 'phuc@nongxanhbvtv.vn', phone: '0914000003' },
		],
	},
	{
		slug: 'an-nong',
		name: 'Đại lý An Nông',
		tenantType: 'RETAIL_DEALER',
		users: [
			{
				username: 'chuan',
				role: 'OWNER',
				fullName: 'Ông An',
				email: 'an@annong.vn',
				phone: '0912000001',
			},
			{
				username: 'quanly.an',
				role: 'MANAGER',
				fullName: 'Chị Mai',
				email: 'mai@annong.vn',
				phone: '0912000002',
			},
			{
				username: 'nhanvien.an',
				role: 'STAFF',
				fullName: 'Anh Phú',
				email: 'phu@annong.vn',
				phone: '0912000003',
			},
		],
	},
	{
		slug: 'xanh-mien-tay',
		name: 'Vật tư Nông nghiệp Xanh Miền Tây',
		tenantType: 'RETAIL_DEALER',
		users: [
			{
				username: 'chubay',
				role: 'OWNER',
				fullName: 'Chú Bảy',
				email: 'bay@xanhmientay.vn',
				phone: '0913000001',
			},
			{
				username: 'quanly.mt',
				role: 'MANAGER',
				fullName: 'Cô Tư',
				email: 'tu@xanhmientay.vn',
				phone: '0913000002',
			},
			{
				username: 'nhanvien.mt',
				role: 'STAFF',
				fullName: 'Em Sơn',
				email: 'son@xanhmientay.vn',
				phone: '0913000003',
			},
		],
	},
];

// --- Catalog dung chung (SKU/code scoped theo tenant nen khong dung nhau) ---

const UNITS = [
	{ code: 'CHAI', name: 'Chai' },
	{ code: 'GOI', name: 'Gói' },
	{ code: 'KG', name: 'Kilôgam' },
	{ code: 'LIT', name: 'Lít' },
	{ code: 'BAO', name: 'Bao' },
	{ code: 'CAI', name: 'Cái' },
] as const;

const CATEGORIES = [
	'Thuốc BVTV',
	'Phân bón',
	'Hạt giống',
	'Thú y - Thủy sản',
	'Vật tư nông nghiệp',
] as const;
const BRANDS = [
	'Đầu Trâu',
	'Phú Mỹ',
	'Syngenta',
	'Bayer',
	'Vimedim',
	'Khác',
] as const;
const MANUFACTURERS = [
	'Bình Điền',
	'Đạm Phú Mỹ',
	'Syngenta VN',
	'Bayer VN',
	'Vemedim',
] as const;

interface DemoProduct {
	sku: string;
	name: string;
	productKind: string;
	domain: string;
	unit: string; // code trong UNITS
	category: string; // ten trong CATEGORIES
	brand: string; // ten trong BRANDS
	manufacturer: string | null;
	cost: number; // VND
	sale: number; // VND
	stock: number; // ton kho ban dau
	activeIngredient?: string;
	concentration?: string;
}

/**
 * Quy cach dong goi + attrs chuyen nganh theo SKU.
 * netContent/netContentUnit la dieu kien de dose-calculator quy doi lieu ra so goi/chai.
 * attrs theo REQUIRED_ATTRS/SPECIALIZED_NUMERIC_ATTRS trong products/product-contract.ts:
 * PESTICIDE can phiDays+reiDays, FERTILIZER can composition + N-P-K.
 */
const PRODUCT_SPECS: Record<
	string,
	{
		netContent: number;
		netContentUnit: string;
		attrs?: Record<string, unknown>;
	}
> = {
	'TBV-001': { netContent: 100, netContentUnit: 'ml', attrs: { phiDays: 7, reiDays: 1 } },
	'TBV-002': { netContent: 100, netContentUnit: 'g', attrs: { phiDays: 7, reiDays: 1 } },
	'TBV-003': { netContent: 900, netContentUnit: 'ml', attrs: { phiDays: 14, reiDays: 2 } },
	'TBV-004': { netContent: 20, netContentUnit: 'g', attrs: { phiDays: 7, reiDays: 1 } },
	'TBV-005': { netContent: 100, netContentUnit: 'ml', attrs: { phiDays: 7, reiDays: 1 } },
	'TBV-006': { netContent: 100, netContentUnit: 'g', attrs: { phiDays: 10, reiDays: 1 } },
	'TBV-007': { netContent: 100, netContentUnit: 'g', attrs: { phiDays: 14, reiDays: 1 } },
	'TBV-008': { netContent: 100, netContentUnit: 'ml', attrs: { phiDays: 14, reiDays: 1 } },
	'TBV-009': { netContent: 1000, netContentUnit: 'ml', attrs: { phiDays: 14, reiDays: 2 } },
	'TBV-010': { netContent: 100, netContentUnit: 'ml', attrs: { phiDays: 7, reiDays: 1 } },
	'TBV-011': { netContent: 100, netContentUnit: 'ml', attrs: { phiDays: 14, reiDays: 1 } },
	'TBV-012': { netContent: 100, netContentUnit: 'g', attrs: { phiDays: 7, reiDays: 1 } },
	'TBV-013': { netContent: 8, netContentUnit: 'g', attrs: { phiDays: 14, reiDays: 1 } },
	'TBV-014': { netContent: 500, netContentUnit: 'ml', attrs: { phiDays: 7, reiDays: 1 } },
	'TBV-015': { netContent: 1000, netContentUnit: 'g', attrs: { phiDays: 10, reiDays: 2 } },
	'TBV-016': { netContent: 100, netContentUnit: 'ml', attrs: { phiDays: 7, reiDays: 1 } },
	'TBV-017': { netContent: 480, netContentUnit: 'ml', attrs: { phiDays: 14, reiDays: 1 } },
	'TBV-018': {
		netContent: 1000,
		netContentUnit: 'g',
		attrs: { composition: 'Trichoderma spp. 10^8 CFU/g' },
	},
	'PB-001': {
		netContent: 50,
		netContentUnit: 'kg',
		attrs: { composition: 'NPK 20-20-15', nitrogenPercent: 20, phosphorusPercent: 20, potassiumPercent: 15 },
	},
	'PB-002': {
		netContent: 50,
		netContentUnit: 'kg',
		attrs: { composition: 'Ure 46%N', nitrogenPercent: 46, phosphorusPercent: 0, potassiumPercent: 0 },
	},
	'PB-003': {
		netContent: 100,
		netContentUnit: 'g',
		attrs: { composition: 'NPK 30-15-10 + TE', nitrogenPercent: 30, phosphorusPercent: 15, potassiumPercent: 10 },
	},
	'PB-004': {
		netContent: 50,
		netContentUnit: 'kg',
		attrs: { composition: 'Kali clorua 60% K2O', nitrogenPercent: 0, phosphorusPercent: 0, potassiumPercent: 60 },
	},
	'PB-005': {
		netContent: 50,
		netContentUnit: 'kg',
		attrs: { composition: 'Lan nung chay 16% P2O5', nitrogenPercent: 0, phosphorusPercent: 16, potassiumPercent: 0 },
	},
	'PB-006': {
		netContent: 50,
		netContentUnit: 'kg',
		attrs: { composition: 'DAP 18-46-0', nitrogenPercent: 18, phosphorusPercent: 46, potassiumPercent: 0 },
	},
	'PB-007': {
		netContent: 25,
		netContentUnit: 'kg',
		attrs: { composition: 'Huu co vi sinh 15% OM, NPK 3-2-2', nitrogenPercent: 3, phosphorusPercent: 2, potassiumPercent: 2 },
	},
	'PB-008': {
		netContent: 500,
		netContentUnit: 'ml',
		attrs: { composition: 'Canxi 10% + Bo 0,5%', nitrogenPercent: 0, phosphorusPercent: 0, potassiumPercent: 0 },
	},
};

const PRODUCTS: DemoProduct[] = [
	{
		sku: 'TBV-001',
		name: 'Thuốc trừ sâu Radiant 60SC (chai 100ml)',
		productKind: 'PESTICIDE',
		domain: 'CROP',
		unit: 'CHAI',
		category: 'Thuốc BVTV',
		brand: 'Syngenta',
		manufacturer: 'Syngenta VN',
		cost: 85000,
		sale: 120000,
		stock: 40,
		activeIngredient: 'Spinetoram',
		concentration: '60g/l',
	},
	{
		sku: 'TBV-002',
		name: 'Thuốc trừ bệnh Antracol 70WP (gói 100g)',
		productKind: 'PESTICIDE',
		domain: 'CROP',
		unit: 'GOI',
		category: 'Thuốc BVTV',
		brand: 'Bayer',
		manufacturer: 'Bayer VN',
		cost: 25000,
		sale: 38000,
		stock: 120,
		activeIngredient: 'Propineb',
		concentration: '70%',
	},
	{
		sku: 'TBV-003',
		name: 'Thuốc trừ cỏ Gramoxone 20SL (chai 900ml)',
		productKind: 'PESTICIDE',
		domain: 'CROP',
		unit: 'CHAI',
		category: 'Thuốc BVTV',
		brand: 'Syngenta',
		manufacturer: 'Syngenta VN',
		cost: 45000,
		sale: 65000,
		stock: 60,
		activeIngredient: 'Paraquat',
		concentration: '20%',
	},
	{ sku: 'TBV-004', name: 'Thuốc trừ rầy Chess 50WG (gói 20g)', productKind: 'PESTICIDE', domain: 'CROP', unit: 'GOI', category: 'Thuốc BVTV', brand: 'Syngenta', manufacturer: 'Syngenta VN', cost: 18000, sale: 28000, stock: 90, activeIngredient: 'Pymetrozine', concentration: '50%', },
	{ sku: 'TBV-005', name: 'Thuốc trừ sâu Voliam Targo 063SC (chai 100ml)', productKind: 'PESTICIDE', domain: 'CROP', unit: 'CHAI', category: 'Thuốc BVTV', brand: 'Syngenta', manufacturer: 'Syngenta VN', cost: 110000, sale: 145000, stock: 35, activeIngredient: 'Chlorantraniliprole', concentration: '63g/l', },
	{ sku: 'TBV-006', name: 'Thuốc trừ bệnh Ridomil Gold 68WG (gói 100g)', productKind: 'PESTICIDE', domain: 'CROP', unit: 'GOI', category: 'Thuốc BVTV', brand: 'Syngenta', manufacturer: 'Syngenta VN', cost: 42000, sale: 58000, stock: 75, activeIngredient: 'Metalaxyl-M', concentration: '68%', },
	{ sku: 'TBV-007', name: 'Thuốc trừ bệnh Beam 75WP (gói 100g)', productKind: 'PESTICIDE', domain: 'CROP', unit: 'GOI', category: 'Thuốc BVTV', brand: 'Bayer', manufacturer: 'Bayer VN', cost: 30000, sale: 45000, stock: 80, activeIngredient: 'Tricyclazole', concentration: '75%', },
	{ sku: 'TBV-008', name: 'Thuốc trừ bệnh Anvil 5SC (chai 100ml)', productKind: 'PESTICIDE', domain: 'CROP', unit: 'CHAI', category: 'Thuốc BVTV', brand: 'Bayer', manufacturer: 'Bayer VN', cost: 52000, sale: 72000, stock: 45, activeIngredient: 'Hexaconazole', concentration: '5%', },
	{ sku: 'TBV-009', name: 'Thuốc trừ cỏ Roundup  Glyphosate (chai 1 lít)', productKind: 'PESTICIDE', domain: 'CROP', unit: 'CHAI', category: 'Thuốc BVTV', brand: 'Syngenta', manufacturer: 'Syngenta VN', cost: 70000, sale: 95000, stock: 50, activeIngredient: 'Glyphosate', concentration: '480g/l', },
	{ sku: 'TBV-010', name: 'Thuốc trừ sâu Vertimec 1.8EC (chai 100ml)', productKind: 'PESTICIDE', domain: 'CROP', unit: 'CHAI', category: 'Thuốc BVTV', brand: 'Syngenta', manufacturer: 'Syngenta VN', cost: 60000, sale: 85000, stock: 55, activeIngredient: 'Abamectin', concentration: '1.8%', },
	{ sku: 'TBV-011', name: 'Thuốc trừ rầy Confidor 200SL (chai 100ml)', productKind: 'PESTICIDE', domain: 'CROP', unit: 'CHAI', category: 'Thuốc BVTV', brand: 'Bayer', manufacturer: 'Bayer VN', cost: 48000, sale: 68000, stock: 65, activeIngredient: 'Imidacloprid', concentration: '200g/l', },
	{ sku: 'TBV-012', name: 'Thuốc gốc đồng Kocide 46.1DF (gói 100g)', productKind: 'PESTICIDE', domain: 'CROP', unit: 'GOI', category: 'Thuốc BVTV', brand: 'Bayer', manufacturer: 'Bayer VN', cost: 36000, sale: 52000, stock: 70, activeIngredient: 'Copper Hydroxide', concentration: '46.1%', },
	{
		sku: 'PB-001',
		name: 'Phân NPK Đầu Trâu 20-20-15 (bao 50kg)',
		productKind: 'FERTILIZER',
		domain: 'GENERAL',
		unit: 'BAO',
		category: 'Phân bón',
		brand: 'Đầu Trâu',
		manufacturer: 'Bình Điền',
		cost: 550000,
		sale: 680000,
		stock: 25,
	},
	{
		sku: 'PB-002',
		name: 'Phân Ure Phú Mỹ (bao 50kg)',
		productKind: 'FERTILIZER',
		domain: 'GENERAL',
		unit: 'BAO',
		category: 'Phân bón',
		brand: 'Phú Mỹ',
		manufacturer: 'Đạm Phú Mỹ',
		cost: 480000,
		sale: 590000,
		stock: 30,
	},
	{
		sku: 'PB-003',
		name: 'Phân bón lá Đầu Trâu 501 (gói 100g)',
		productKind: 'FERTILIZER',
		domain: 'CROP',
		unit: 'GOI',
		category: 'Phân bón',
		brand: 'Đầu Trâu',
		manufacturer: 'Bình Điền',
		cost: 12000,
		sale: 20000,
		stock: 200,
	},
	{ sku: 'TBV-013', name: 'Thuốc trừ sâu Regent 800WG (gói 8g)', productKind: 'PESTICIDE', domain: 'CROP', unit: 'GOI', category: 'Thuốc BVTV', brand: 'Bayer', manufacturer: 'Bayer VN', cost: 12000, sale: 20000, stock: 150, activeIngredient: 'Fipronil', concentration: '800g/kg', },
	{ sku: 'TBV-014', name: 'Thuốc trừ bệnh Validacin 5SL (chai 500ml)', productKind: 'PESTICIDE', domain: 'CROP', unit: 'CHAI', category: 'Thuốc BVTV', brand: 'Khác', manufacturer: null, cost: 55000, sale: 78000, stock: 40, activeIngredient: 'Validamycin', concentration: '5%', },
	{ sku: 'TBV-015', name: 'Thuốc trừ bệnh Dithane M-45 80WP (gói 1kg)', productKind: 'PESTICIDE', domain: 'CROP', unit: 'GOI', category: 'Thuốc BVTV', brand: 'Bayer', manufacturer: 'Bayer VN', cost: 95000, sale: 130000, stock: 45, activeIngredient: 'Mancozeb', concentration: '80%', },
	{ sku: 'TBV-016', name: 'Thuốc trừ nhện Ortus 5SC (chai 100ml)', productKind: 'PESTICIDE', domain: 'CROP', unit: 'CHAI', category: 'Thuốc BVTV', brand: 'Khác', manufacturer: null, cost: 78000, sale: 105000, stock: 30, activeIngredient: 'Fenpyroximate', concentration: '5%', },
	{ sku: 'TBV-017', name: 'Thuốc trừ bệnh Fuji-One 40EC (chai 480ml)', productKind: 'PESTICIDE', domain: 'CROP', unit: 'CHAI', category: 'Thuốc BVTV', brand: 'Khác', manufacturer: null, cost: 88000, sale: 120000, stock: 35, activeIngredient: 'Isoprothiolane', concentration: '40%', },
	{ sku: 'TBV-018', name: 'Nấm đối kháng Trichoderma (gói 1kg)', productKind: 'BIOLOGICAL_PRODUCT', domain: 'CROP', unit: 'GOI', category: 'Thuốc BVTV', brand: 'Khác', manufacturer: null, cost: 40000, sale: 60000, stock: 60, activeIngredient: 'Trichoderma spp.', concentration: '10^8 CFU/g', },
	{ sku: 'PB-004', name: 'Phân Kali Clorua MOP (bao 50kg)', productKind: 'FERTILIZER', domain: 'GENERAL', unit: 'BAO', category: 'Phân bón', brand: 'Phú Mỹ', manufacturer: 'Đạm Phú Mỹ', cost: 620000, sale: 760000, stock: 20, },
	{ sku: 'PB-005', name: 'Phân Lân nung chảy Văn Điển (bao 50kg)', productKind: 'FERTILIZER', domain: 'GENERAL', unit: 'BAO', category: 'Phân bón', brand: 'Khác', manufacturer: null, cost: 300000, sale: 390000, stock: 25, },
	{ sku: 'PB-006', name: 'Phân DAP 18-46-0 (bao 50kg)', productKind: 'FERTILIZER', domain: 'GENERAL', unit: 'BAO', category: 'Phân bón', brand: 'Phú Mỹ', manufacturer: 'Đạm Phú Mỹ', cost: 780000, sale: 950000, stock: 18, },
	{ sku: 'PB-007', name: 'Phân hữu cơ vi sinh (bao 25kg)', productKind: 'FERTILIZER', domain: 'CROP', unit: 'BAO', category: 'Phân bón', brand: 'Khác', manufacturer: null, cost: 120000, sale: 175000, stock: 40, },
	{ sku: 'PB-008', name: 'Phân bón lá Canxi-Bo (chai 500ml)', productKind: 'FERTILIZER', domain: 'CROP', unit: 'CHAI', category: 'Phân bón', brand: 'Đầu Trâu', manufacturer: 'Bình Điền', cost: 35000, sale: 55000, stock: 90, },
	{
		sku: 'HG-001',
		name: 'Hạt giống lúa OM5451 (túi 1kg)',
		productKind: 'CROP_SEED',
		domain: 'CROP',
		unit: 'GOI',
		category: 'Hạt giống',
		brand: 'Khác',
		manufacturer: null,
		cost: 35000,
		sale: 48000,
		stock: 80,
	},
	{
		sku: 'HG-002',
		name: 'Hạt giống dưa leo F1 (gói 10g)',
		productKind: 'CROP_SEED',
		domain: 'CROP',
		unit: 'GOI',
		category: 'Hạt giống',
		brand: 'Khác',
		manufacturer: null,
		cost: 25000,
		sale: 45000,
		stock: 150,
	},
	{
		sku: 'TY-001',
		name: 'Vime-Clean khử trùng chuồng trại (chai 1 lít)',
		productKind: 'VET_DRUG',
		domain: 'LIVESTOCK',
		unit: 'CHAI',
		category: 'Thú y - Thủy sản',
		brand: 'Vimedim',
		manufacturer: 'Vemedim',
		cost: 60000,
		sale: 90000,
		stock: 35,
	},
	{
		sku: 'TS-001',
		name: 'Men vi sinh EM gốc (can 1 lít)',
		productKind: 'AQUA_DRUG',
		domain: 'AQUACULTURE',
		unit: 'CHAI',
		category: 'Thú y - Thủy sản',
		brand: 'Khác',
		manufacturer: null,
		cost: 30000,
		sale: 50000,
		stock: 45,
	},
	{
		sku: 'VT-001',
		name: 'Bình xịt thuốc 16 lít',
		productKind: 'AGRI_MATERIAL',
		domain: 'GENERAL',
		unit: 'CAI',
		category: 'Vật tư nông nghiệp',
		brand: 'Khác',
		manufacturer: null,
		cost: 220000,
		sale: 320000,
		stock: 15,
	},
	{
		sku: 'VT-002',
		name: 'Bao tay cao su làm vườn (gói 12 đôi)',
		productKind: 'AGRI_MATERIAL',
		domain: 'GENERAL',
		unit: 'GOI',
		category: 'Vật tư nông nghiệp',
		brand: 'Khác',
		manufacturer: null,
		cost: 8000,
		sale: 15000,
		stock: 300,
	},
];

// --- Helpers idempotent ---

async function provisionTenant(
	owner: DemoUser,
	t: DemoTenant,
): Promise<string> {
	// Clone grants tu system role template (tenantId=null).
	const templates = await prisma.role.findMany({
		where: {
			tenantId: null,
			code: { in: PER_TENANT_ROLES.map((r) => r.code) },
		},
		select: { code: true, permissions: { select: { permissionId: true } } },
	});
	const grantsByCode = new Map(
		templates.map((r) => [r.code, r.permissions.map((p) => p.permissionId)]),
	);
	if (grantsByCode.size < PER_TENANT_ROLES.length) {
		throw new Error(
			'Thieu system role template (OWNER/MANAGER/STAFF). Chay `pnpm db:seed` truoc.',
		);
	}
	const ownerHash = await argon2.hash(DEMO_PASSWORD, ARGON2_OPTS);

	return prisma.$transaction(async (tx) => {
		const tenant = await tx.tenant.create({
			data: {
				slug: t.slug,
				name: t.name,
				tenantType: t.tenantType,
				mode: 'SIMPLE',
				status: 'ACTIVE',
				seatBonus: 10,
			},
			select: { id: true },
		});
		let ownerRoleId = '';
		for (const spec of PER_TENANT_ROLES) {
			const role = await tx.role.create({
				data: {
					tenantId: tenant.id,
					code: spec.code,
					name: spec.name,
					isSystem: false,
					isAdmin: false,
					rank: spec.rank,
				},
				select: { id: true },
			});
			if (spec.code === 'OWNER') ownerRoleId = role.id;
			const grants = grantsByCode.get(spec.code) ?? [];
			if (grants.length > 0) {
				await tx.rolePermission.createMany({
					data: grants.map((permissionId) => ({
						roleId: role.id,
						permissionId,
					})),
					skipDuplicates: true,
				});
			}
		}
		await tx.user.create({
			data: {
				tenantId: tenant.id,
				username: owner.username,
				email: owner.email,
				phone: owner.phone,
				passwordHash: ownerHash,
				mustChangePassword: false,
				fullName: owner.fullName,
				roleId: ownerRoleId,
				status: 'ACTIVE',
				createdByType: 'USER',
			},
		});
		return tenant.id;
	});
}

async function ensureUser(
	tenantId: string,
	roleId: string,
	u: DemoUser,
): Promise<void> {
	const hash = await argon2.hash(DEMO_PASSWORD, ARGON2_OPTS);
	await prisma.user.upsert({
		where: { tenantId_username: { tenantId, username: u.username } },
		// Giu nguyen passwordHash cu khi update -> khong clobber owner da co.
		update: {
			fullName: u.fullName,
			email: u.email,
			phone: u.phone,
			roleId,
			status: 'ACTIVE',
		},
		create: {
			tenantId,
			username: u.username,
			email: u.email,
			phone: u.phone,
			passwordHash: hash,
			mustChangePassword: false,
			fullName: u.fullName,
			roleId,
			status: 'ACTIVE',
			createdByType: 'USER',
		},
	});
}

async function seedBvtvRelations(tenantId: string): Promise<void> {
	const warehouse = await prisma.warehouse.findFirstOrThrow({ where: { tenantId, code: 'DEFAULT' } });
	const owner = await prisma.user.findFirstOrThrow({ where: { tenantId, username: 'chubvtv' } });
	const units = await prisma.unit.findMany({ where: { tenantId }, select: { id: true, code: true } });
	const unitByCode = new Map(units.map((unit) => [unit.code, unit.id]));
	const products = await prisma.product.findMany({
		where: { tenantId, sku: { in: ['TBV-001', 'TBV-002', 'TBV-003', 'TBV-004', 'TBV-005', 'TBV-006', 'TBV-007', 'TBV-008', 'TBV-009', 'TBV-010', 'TBV-011', 'TBV-012', 'PB-001', 'PB-002', 'PB-003'] } },
		select: { id: true, sku: true, name: true, baseUnitId: true, salePrice: true, costPrice: true, activeIngredient: true },
	});
	const productBySku = new Map(products.map((product) => [product.sku, product]));
	const productSpecs = [
		['TBV-001', 'LOT-RAD-2026', 40, '2026-12-31'],
		['TBV-002', 'LOT-ANT-2026', 120, '2027-03-31'],
		['TBV-003', 'LOT-GRA-2026', 60, '2027-01-31'],
		['TBV-004', 'LOT-CHESS-2026', 90, '2027-04-30'],
		['TBV-005', 'LOT-TARGO-2026', 35, '2027-05-31'],
		['TBV-006', 'LOT-RIDO-2026', 75, '2027-02-28'],
		['TBV-007', 'LOT-BEAM-2026', 80, '2027-03-31'],
		['TBV-008', 'LOT-ANVIL-2026', 45, '2027-04-30'],
		['TBV-009', 'LOT-ROUND-2026', 50, '2027-01-31'],
		['TBV-010', 'LOT-VERTI-2026', 55, '2027-05-31'],
		['TBV-011', 'LOT-CONFI-2026', 65, '2027-06-30'],
		['TBV-012', 'LOT-KOCIDE-2026', 70, '2027-02-28'],
		['PB-001', 'LOT-NPK-2026', 25, '2027-06-30'],
		['PB-002', 'LOT-URE-2026', 30, '2027-06-30'],
		['PB-003', 'LOT-LA-2026', 200, '2027-02-28'],
	] as const;
	const batches = new Map<string, { id: string; qty: number }>();
	for (const [sku, batchCode, qty, expiresAt] of productSpecs) {
		const product = productBySku.get(sku);
		if (!product) continue;
		const batch = await prisma.productBatch.upsert({
			where: { tenantId_productId_warehouseId_batchCode: { tenantId, productId: product.id, warehouseId: warehouse.id, batchCode } },
			update: { expiresAt: new Date(`${expiresAt}T00:00:00.000Z`), qtyOnHand: qty },
			create: { tenantId, productId: product.id, warehouseId: warehouse.id, batchCode, manufacturedAt: new Date('2026-01-15T00:00:00.000Z'), expiresAt: new Date(`${expiresAt}T00:00:00.000Z`), qtyOnHand: qty },
			select: { id: true },
		});
		await prisma.stock.upsert({
			where: { warehouseId_productId: { warehouseId: warehouse.id, productId: product.id } },
			update: { qty, avgCost: product.costPrice },
			create: { tenantId, warehouseId: warehouse.id, productId: product.id, qty, avgCost: product.costPrice },
		});
		batches.set(sku, { id: batch.id, qty });
	}
	const supplier = await prisma.supplier.upsert({
		where: { tenantId_code: { tenantId, code: 'NPP-SYNGENTA' } },
		update: { name: 'Nhà phân phối Vật tư Xanh', status: 'ACTIVE' },
		create: { tenantId, code: 'NPP-SYNGENTA', name: 'Nhà phân phối Vật tư Xanh', supplierType: 'CROP_PROTECTION', contactName: 'Nguyễn Văn Nam', phone: '0905000001', address: 'Khu công nghiệp Trà Nóc', province: 'Cần Thơ', status: 'ACTIVE', paymentTerms: '30 ngày' },
		select: { id: true },
	});
	const purchaseLines = ['TBV-001', 'TBV-002', 'TBV-003'].flatMap((sku) => {
		const product = productBySku.get(sku);
		const batch = batches.get(sku);
		if (!product || !batch) return [];
		const qty = Math.min(10, batch.qty);
		return [{ tenantId, productId: product.id, unitId: product.baseUnitId, qty, qtyBase: qty, unitPrice: product.costPrice, lineTotal: product.costPrice * BigInt(qty), batchCode: `PUR-${batch.id.slice(0, 8)}`, manufacturedAt: new Date('2026-01-15T00:00:00.000Z'), expiresAt: null, batchId: batch.id }];
	});
	const purchase = await prisma.purchase.upsert({
		where: { tenantId_docNo: { tenantId, docNo: 'PN-BVTV-0001' } },
		update: { status: 'COMPLETED', supplierId: supplier.id, warehouseId: warehouse.id, subtotal: purchaseLines.reduce((sum, line) => sum + line.lineTotal, 0n), total: purchaseLines.reduce((sum, line) => sum + line.lineTotal, 0n), amountPaid: 0n, debtAmount: purchaseLines.reduce((sum, line) => sum + line.lineTotal, 0n), completedAt: new Date() },
		create: { tenantId, docNo: 'PN-BVTV-0001', idempotencyKey: 'seed-bvtv-purchase-1', supplierId: supplier.id, warehouseId: warehouse.id, status: 'COMPLETED', subtotal: purchaseLines.reduce((sum, line) => sum + line.lineTotal, 0n), total: purchaseLines.reduce((sum, line) => sum + line.lineTotal, 0n), amountPaid: 0n, debtAmount: purchaseLines.reduce((sum, line) => sum + line.lineTotal, 0n), paymentMethod: 'CREDIT', createdBy: owner.id, completedAt: new Date() },
		select: { id: true },
	});
	for (const line of purchaseLines) await prisma.purchaseLine.deleteMany({ where: { purchaseId: purchase.id, productId: line.productId } });
	if (purchaseLines.length) await prisma.purchaseLine.createMany({ data: purchaseLines.map((line) => ({ ...line, purchaseId: purchase.id })) });
	const purchaseDebt = purchaseLines.reduce((sum, line) => sum + line.lineTotal, 0n);
	const existingPurchaseDebt = await prisma.debtLedger.findFirst({ where: { tenantId, partyType: 'SUPPLIER', partyId: supplier.id, refType: 'PURCHASE', refId: purchase.id } });
	if (!existingPurchaseDebt) await prisma.debtLedger.create({ data: { tenantId, partyType: 'SUPPLIER', partyId: supplier.id, entryType: 'PURCHASE', direction: 'INCREASE', amount: purchaseDebt, balanceAfter: purchaseDebt, refType: 'PURCHASE', refId: purchase.id, createdBy: owner.id, note: 'Công nợ nhập hàng seed demo' } });
	await prisma.supplier.update({ where: { id: supplier.id }, data: { balance: purchaseDebt } });
	const customer = await prisma.customer.findFirst({ where: { tenantId, phone: '0906000001' }, select: { id: true } }) ?? await prisma.customer.create({ data: { tenantId, code: 'KH-BVTV-001', name: 'Anh Ba - Hộ trồng lúa', nameSearch: 'anh ba ho trong lua', phone: '0906000001', address: 'Vĩnh Long', type: 'FARMER', productionProfile: { crop: 'Lúa', areaHa: 3, currentStage: 'Đẻ nhánh' }, debtLimit: 10000000n } });
	const disease = await prisma.disease.upsert({ where: { id: (await prisma.disease.findFirst({ where: { tenantId, name: 'Đạo ôn' }, select: { id: true } }))?.id ?? '00000000-0000-0000-0000-000000000000' }, update: {}, create: { tenantId, name: 'Đạo ôn', nameSearch: normalizeVietnameseSearch('Đạo ôn'), aliases: ['cháy lá', 'blast'], aliasesSearch: normalizeSearchList(['cháy lá', 'blast']), domain: 'CROP', handbookCategory: 'CROP_PROTECTION_AND_FERTILIZER', target: 'Lúa', type: 'DISEASE', symptom: 'Vết bệnh hình thoi, lá cháy khô, bông lép.', note: 'Phun khi bệnh mới chớm.' }, select: { id: true } });
	const diseaseSpecs = [
		['Rầy nâu', 'PEST', 'Lúa', 'Spinetoram', 'TBV-001'],
		['Sâu cuốn lá', 'PEST', 'Lúa', 'Spinetoram', 'TBV-001'],
		['Đốm lá', 'DISEASE', 'Rau màu', 'Propineb', 'TBV-002'],
		['Cỏ dại ruộng cạn', 'WEED', 'Cây trồng cạn', 'Paraquat', 'TBV-003'],
	] as const;
	const diseases = [{ id: disease.id, name: 'Đạo ôn', ingredient: 'Propineb', sku: 'TBV-002', type: 'DISEASE', target: 'Lúa' }, ...diseaseSpecs.map(([name, type, target, ingredient, sku]) => ({ id: '', name, ingredient, sku, type, target }))];
	for (const spec of diseases) {
		let diseaseId = spec.id;
		if (!diseaseId) {
			const found = await prisma.disease.findFirst({ where: { tenantId, name: spec.name }, select: { id: true } });
			diseaseId = found?.id ?? (await prisma.disease.create({ data: { tenantId, name: spec.name, nameSearch: normalizeVietnameseSearch(spec.name), aliases: [], aliasesSearch: '', domain: 'CROP', handbookCategory: 'CROP_PROTECTION_AND_FERTILIZER', target: spec.target, type: spec.type as 'DISEASE' | 'PEST' | 'WEED', symptom: `Triệu chứng thường gặp của ${spec.name}.` }, select: { id: true } })).id;
		}
		await prisma.diseaseIngredient.deleteMany({ where: { tenantId, diseaseId } });
		await prisma.diseaseIngredient.create({ data: { tenantId, diseaseId, activeIngredient: spec.ingredient, sortOrder: 0 } });
		const product = productBySku.get(spec.sku);
		if (product) await prisma.diseaseProductPin.upsert({ where: { diseaseId_productId: { diseaseId, productId: product.id } }, update: { isExcluded: false, sortOrder: 0 }, create: { tenantId, diseaseId, productId: product.id, sortOrder: 0, isExcluded: false } });
	}
	const secondaryLinks = [
		['Đạo ôn', 'Tricyclazole', 'TBV-007'],
		['Rầy nâu', 'Pymetrozine', 'TBV-004'],
		['Sâu cuốn lá', 'Chlorantraniliprole', 'TBV-005'],
		['Đốm lá', 'Copper Hydroxide', 'TBV-012'],
		['Cỏ dại ruộng cạn', 'Glyphosate', 'TBV-009'],
	] as const;
	for (const [name, ingredient, sku] of secondaryLinks) {
		const secondaryDisease = await prisma.disease.findFirstOrThrow({ where: { tenantId, name: name }, select: { id: true } });
		const secondaryProduct = productBySku.get(sku);
		if (!secondaryProduct) continue;
		const hasIngredient = await prisma.diseaseIngredient.findFirst({ where: { tenantId, diseaseId: secondaryDisease.id, activeIngredient: ingredient } });
		if (!hasIngredient) await prisma.diseaseIngredient.create({ data: { tenantId, diseaseId: secondaryDisease.id, activeIngredient: ingredient, sortOrder: 1 } });
		await prisma.diseaseProductPin.upsert({ where: { diseaseId_productId: { diseaseId: secondaryDisease.id, productId: secondaryProduct.id } }, update: { isExcluded: false, sortOrder: 1 }, create: { tenantId, diseaseId: secondaryDisease.id, productId: secondaryProduct.id, sortOrder: 1, isExcluded: false } });
	}
	const dosageByDisease = new Map([
		['Đạo ôn', 1],
		['Rầy nâu', 1],
		['Sâu cuốn lá', 1],
		['Đốm lá', 1],
		['Cỏ dại ruộng cạn', 1.5],
	]);
	for (const [name] of dosageByDisease) {
		const row = await prisma.disease.findFirst({ where: { tenantId, name }, select: { id: true } });
		if (!row) continue;
		await prisma.disease.update({ where: { id: row.id }, data: { formulaExpr: 'area_mau * dose_per_mau' } });
		await prisma.diseaseConsultField.deleteMany({ where: { tenantId, diseaseId: row.id } });
		await prisma.diseaseConsultField.createMany({ data: [
			{ tenantId, diseaseId: row.id, fieldKey: 'area_mau', label: 'Quy mô ruộng', fieldType: 'SELECT', unit: 'mẫu', options: { choices: [{ label: '1 mẫu', value: 1 }, { label: '5 mẫu', value: 5 }, { label: '10 mẫu', value: 10 }, { label: '20 mẫu', value: 20 }] }, required: true, sortOrder: 0 },
			{ tenantId, diseaseId: row.id, fieldKey: 'dose_per_mau', label: 'Liều thuốc / mẫu', fieldType: 'SELECT', unit: 'đơn vị thuốc/mẫu', options: { choices: [{ label: '0,5 đơn vị/mẫu', value: 0.5 }, { label: '1 đơn vị/mẫu', value: 1 }, { label: '1,5 đơn vị/mẫu', value: 1.5 }, { label: '2 đơn vị/mẫu', value: 2 }], help: 'Chọn theo nhãn thuốc và tình trạng ruộng.' }, required: true, sortOrder: 1 },
		] });
	}
	const saleProduct = productBySku.get('TBV-001');
	const saleBatch = batches.get('TBV-001');
	if (saleProduct && saleBatch) {
		const qty = 2;
		const lineTotal = saleProduct.salePrice * BigInt(qty);
		const sale = await prisma.sale.upsert({ where: { tenantId_docNo: { tenantId, docNo: 'BH-BVTV-0001' } }, update: { customerId: customer.id, diseaseId: disease.id, diseaseNameSnapshot: 'Đạo ôn', total: lineTotal, subtotal: lineTotal, amountPaid: 0n, debtAmount: lineTotal, paymentMethod: 'CASH', completedAt: new Date() }, create: { tenantId, docNo: 'BH-BVTV-0001', idempotencyKey: 'seed-bvtv-sale-1', channel: 'QUICK_SALE', status: 'COMPLETED', customerId: customer.id, customerNameSnapshot: 'Anh Ba - Hộ trồng lúa', customerPhoneSnapshot: '0906000001', warehouseId: warehouse.id, subtotal: lineTotal, total: lineTotal, amountPaid: 0n, debtAmount: lineTotal, paymentMethod: 'CASH', diseaseId: disease.id, diseaseNameSnapshot: 'Đạo ôn', consultContext: { target: 'Lúa', symptom: 'Vết bệnh hình thoi' }, suggestedQtyMeta: { source: 'seed', qty }, createdBy: owner.id, completedAt: new Date() }, select: { id: true } });
		await prisma.saleLine.deleteMany({ where: { saleId: sale.id } });
		const line = await prisma.saleLine.create({ data: { id: `00000000-0000-0000-0000-${sale.id.slice(-12)}`, tenantId, saleId: sale.id, productId: saleProduct.id, productNameSnapshot: saleProduct.name, unitId: saleProduct.baseUnitId, qty, qtyBase: qty, unitPrice: saleProduct.salePrice, lineTotal, unitCost: saleProduct.costPrice, batchId: saleBatch.id } });
		await prisma.saleLineBatch.create({ data: { saleLineId: line.id, batchId: saleBatch.id, qtyBase: qty } });
		await prisma.customer.update({ where: { id: customer.id }, data: { balance: lineTotal } });
		const existingSaleDebt = await prisma.debtLedger.findFirst({ where: { tenantId, partyType: 'CUSTOMER', partyId: customer.id, refType: 'SALE', refId: sale.id } });
		if (!existingSaleDebt) await prisma.debtLedger.create({ data: { tenantId, partyType: 'CUSTOMER', partyId: customer.id, entryType: 'SALE', direction: 'INCREASE', amount: lineTotal, balanceAfter: lineTotal, refType: 'SALE', refId: sale.id, createdBy: owner.id, note: 'Công nợ bán thuốc seed demo' } });
		const voucher = await prisma.paymentVoucher.upsert({ where: { tenantId_docNo: { tenantId, docNo: 'PT-BVTV-0001' } }, update: {}, create: { tenantId, docNo: 'PT-BVTV-0001', idempotencyKey: 'seed-bvtv-voucher-1', voucherType: 'RECEIPT', partyType: 'CUSTOMER', partyId: customer.id, amount: 30000n, method: 'CASH', refSaleId: sale.id, customerId: customer.id, createdBy: owner.id, note: 'Khách trả trước một phần' }, select: { id: true } });
		await prisma.paymentVoucherLine.deleteMany({ where: { voucherId: voucher.id } });
		await prisma.paymentVoucherLine.create({ data: { voucherId: voucher.id, method: 'CASH', amount: 30000n, refSaleId: sale.id } });
	}
	const adjustment = await prisma.stockAdjustment.upsert({ where: { tenantId_docNo: { tenantId, docNo: 'DC-BVTV-0001' } }, update: {}, create: { tenantId, docNo: 'DC-BVTV-0001', warehouseId: warehouse.id, status: 'COMPLETED', note: 'Điều chỉnh kiểm kê lô TBV-002', createdBy: owner.id }, select: { id: true } });
	const adjustProduct = productBySku.get('TBV-002');
	const adjustBatch = batches.get('TBV-002');
	if (adjustProduct && adjustBatch) await prisma.stockAdjustmentLine.deleteMany({ where: { adjustmentId: adjustment.id } }).then(() => prisma.stockAdjustmentLine.create({ data: { adjustmentId: adjustment.id, productId: adjustProduct.id, batchId: adjustBatch.id, qtyBefore: 120, qtyAfter: 120, delta: 0, reasonCode: 'COUNT_CONFIRMED' } }));
	console.log(`  [REL] ${tenantId}: batches=${batches.size}, purchaseLines=${purchaseLines.length}, diseases=${diseases.length}, sale=BH-BVTV-0001`);
}

// findFirst-then-create cho model khong co unique (tenantId, name).
// --- So tay: bo thuoc khuyen nghi + link benh <-> thuoc ---

interface ProtocolSeedItem {
	sku: string;
	doseAmount: number;
	/** Cung ho don vi voi netContentUnit cua san pham, neu khong dose-calculator khong quy ra so goi. */
	doseUnit: 'ml' | 'g' | 'kg';
	perAreaAmount: number;
	perAreaUnit: 'M2' | 'HA' | 'SAO_BAC' | 'SAO_TRUNG' | 'CONG_NAM';
	mixing?: string;
	usage?: string;
}

interface ProtocolSeed {
	name: string;
	note?: string;
	isDefault: boolean;
	items: ProtocolSeedItem[];
}

/**
 * Bo thuoc mau cho 6 benh nhom BVTV + phan bon, key theo ten benh trong HANDBOOK_DEFAULTS
 * (prisma/seed.ts). Moi benh co 1 bo chinh + 1 bo thay the de quay ban co duong lui khi het hang.
 * Lieu tinh tren 1 cong Nam Bo (1.000 m2) cho de doi chieu voi thuc te dong bang.
 */
const HANDBOOK_PROTOCOLS: Record<string, ProtocolSeed[]> = {
	'Đạo ôn': [
		{
			name: 'Bộ thuốc chính',
			note: 'Phun khi vết bệnh mới chớm, nhắc lại sau 5-7 ngày nếu trời âm u.',
			isDefault: true,
			items: [
				{ sku: 'TBV-007', doseAmount: 15, doseUnit: 'g', perAreaAmount: 1, perAreaUnit: 'CONG_NAM', mixing: 'Pha 15g cho bình 25 lít nước.', usage: 'Phun ướt đều tán lá, tránh phun lúc nắng gắt.' },
				{ sku: 'PB-003', doseAmount: 20, doseUnit: 'g', perAreaAmount: 1, perAreaUnit: 'CONG_NAM', usage: 'Phun phục hồi sau khi bệnh ngừng lây lan.' },
			],
		},
		{
			name: 'Bộ thuốc thay thế',
			note: 'Dùng khi Beam hết hàng hoặc cần luân phiên hoạt chất chống kháng.',
			isDefault: false,
			items: [
				{ sku: 'TBV-017', doseAmount: 30, doseUnit: 'ml', perAreaAmount: 1, perAreaUnit: 'CONG_NAM', mixing: 'Pha 30ml cho bình 25 lít nước.' },
				{ sku: 'TBV-014', doseAmount: 40, doseUnit: 'ml', perAreaAmount: 1, perAreaUnit: 'CONG_NAM', usage: 'Phòng khô vằn đi kèm khi ruộng rậm.' },
			],
		},
	],
	'Rầy nâu': [
		{
			name: 'Bộ thuốc chính',
			note: 'Phun khi rầy đạt 3 con/dảnh, rẽ hàng phun vào gốc lúa.',
			isDefault: true,
			items: [
				{ sku: 'TBV-004', doseAmount: 8, doseUnit: 'g', perAreaAmount: 1, perAreaUnit: 'CONG_NAM', mixing: 'Pha 8g cho bình 25 lít nước.', usage: 'Phun vào gốc, nơi rầy trú.' },
				{ sku: 'PB-008', doseAmount: 25, doseUnit: 'ml', perAreaAmount: 1, perAreaUnit: 'CONG_NAM', usage: 'Bổ sung canxi-bo giúp cứng cây sau khi rầy giảm.' },
			],
		},
		{
			name: 'Bộ thuốc thay thế',
			isDefault: false,
			items: [
				{ sku: 'TBV-013', doseAmount: 2, doseUnit: 'g', perAreaAmount: 1, perAreaUnit: 'CONG_NAM', mixing: 'Pha 2g cho bình 25 lít nước.' },
			],
		},
	],
	'Sâu cuốn lá': [
		{
			name: 'Bộ thuốc chính',
			note: 'Phun khi sâu tuổi 1-2, trước khi cuốn lá kín.',
			isDefault: true,
			items: [
				{ sku: 'TBV-005', doseAmount: 20, doseUnit: 'ml', perAreaAmount: 1, perAreaUnit: 'CONG_NAM', mixing: 'Pha 20ml cho bình 25 lít nước.' },
				{ sku: 'PB-003', doseAmount: 20, doseUnit: 'g', perAreaAmount: 1, perAreaUnit: 'CONG_NAM' },
			],
		},
		{
			name: 'Bộ thuốc thay thế',
			isDefault: false,
			items: [
				{ sku: 'TBV-013', doseAmount: 2, doseUnit: 'g', perAreaAmount: 1, perAreaUnit: 'CONG_NAM' },
			],
		},
	],
	'Cỏ dại ruộng cạn': [
		{
			name: 'Bộ thuốc chính',
			note: 'Phun khi cỏ cao 10-15cm, tránh phun dính lá cây trồng.',
			isDefault: true,
			items: [
				{ sku: 'TBV-009', doseAmount: 100, doseUnit: 'ml', perAreaAmount: 1, perAreaUnit: 'CONG_NAM', usage: 'Dùng béc chụp, không phun ngược gió.' },
			],
		},
		{
			name: 'Bộ thuốc thay thế',
			note: 'Cháy nhanh hơn nhưng không diệt được gốc rễ.',
			isDefault: false,
			items: [
				{ sku: 'TBV-003', doseAmount: 80, doseUnit: 'ml', perAreaAmount: 1, perAreaUnit: 'CONG_NAM' },
			],
		},
	],
	'Vàng lá gân xanh': [
		{
			name: 'Bộ thuốc chính',
			note: 'Trị rầy chổng cánh môi giới + phục hồi bộ rễ. Cây đã nhiễm nặng nên đốn bỏ.',
			isDefault: true,
			items: [
				{ sku: 'TBV-011', doseAmount: 15, doseUnit: 'ml', perAreaAmount: 1, perAreaUnit: 'CONG_NAM', usage: 'Phun khi cây ra đọt non, đúng lúc rầy đẻ.' },
				{ sku: 'TBV-018', doseAmount: 200, doseUnit: 'g', perAreaAmount: 1, perAreaUnit: 'CONG_NAM', usage: 'Trộn gốc để đối kháng nấm rễ.' },
				{ sku: 'PB-008', doseAmount: 30, doseUnit: 'ml', perAreaAmount: 1, perAreaUnit: 'CONG_NAM' },
			],
		},
		{
			name: 'Bộ thuốc thay thế',
			isDefault: false,
			items: [
				{ sku: 'TBV-001', doseAmount: 15, doseUnit: 'ml', perAreaAmount: 1, perAreaUnit: 'CONG_NAM' },
				{ sku: 'PB-007', doseAmount: 5, doseUnit: 'kg', perAreaAmount: 1, perAreaUnit: 'CONG_NAM', usage: 'Bón gốc cải tạo đất đầu mùa mưa.' },
			],
		},
	],
	'Sương mai': [
		{
			name: 'Bộ thuốc chính',
			note: 'Phun phòng khi trời ẩm kéo dài, đừng đợi thấy mốc trắng.',
			isDefault: true,
			items: [
				{ sku: 'TBV-015', doseAmount: 60, doseUnit: 'g', perAreaAmount: 1, perAreaUnit: 'CONG_NAM', mixing: 'Pha 60g cho bình 25 lít nước.' },
				{ sku: 'PB-003', doseAmount: 20, doseUnit: 'g', perAreaAmount: 1, perAreaUnit: 'CONG_NAM' },
			],
		},
		{
			name: 'Bộ thuốc thay thế',
			note: 'Lưu dẫn mạnh hơn, dùng khi bệnh đã lan.',
			isDefault: false,
			items: [
				{ sku: 'TBV-006', doseAmount: 50, doseUnit: 'g', perAreaAmount: 1, perAreaUnit: 'CONG_NAM' },
			],
		},
	],
};

/**
 * Ghi bo thuoc cho tung benh + pin san pham lien quan.
 * Idempotent: xoa sach protocol cu cua benh roi ghi lai. Benh chua ton tai (chua chay
 * `pnpm db:seed`) thi bo qua va bao so luong o cuoi.
 */
async function seedHandbookProtocols(tenantId: string): Promise<void> {
	const skus = [
		...new Set(
			Object.values(HANDBOOK_PROTOCOLS).flatMap((protocols) =>
				protocols.flatMap((protocol) => protocol.items.map((item) => item.sku)),
			),
		),
	];
	const products = await prisma.product.findMany({
		where: { tenantId, sku: { in: skus }, deletedAt: null },
		select: { id: true, sku: true, activeIngredient: true },
	});
	const productBySku = new Map(products.map((product) => [product.sku, product]));

	let protocolCount = 0;
	let skipped = 0;
	for (const [diseaseName, protocols] of Object.entries(HANDBOOK_PROTOCOLS)) {
		const disease = await prisma.disease.findFirst({
			where: { tenantId, name: diseaseName, deletedAt: null },
			select: { id: true },
		});
		if (!disease) {
			skipped += 1;
			continue;
		}
		await prisma.diseaseProtocol.deleteMany({
			where: { tenantId, diseaseId: disease.id },
		});
		for (const [sortOrder, protocol] of protocols.entries()) {
			const items = protocol.items.filter((item) => productBySku.has(item.sku));
			if (!items.length) continue;
			await prisma.diseaseProtocol.create({
				data: {
					tenantId,
					diseaseId: disease.id,
					name: protocol.name,
					note: protocol.note ?? null,
					isDefault: protocol.isDefault,
					sortOrder,
					items: {
						create: items.map((item, itemOrder) => {
							const product = productBySku.get(item.sku);
							return {
								tenantId,
								productId: product?.id ?? null,
								activeIngredient: product?.activeIngredient ?? null,
								doseAmount: item.doseAmount,
								doseUnit: item.doseUnit,
								perAreaAmount: item.perAreaAmount,
								perAreaUnit: item.perAreaUnit,
								mixing: item.mixing ?? null,
								usage: item.usage ?? null,
								sortOrder: itemOrder,
							};
						}),
					},
				},
			});
			protocolCount += 1;
		}
		// Pin moi san pham co trong bo thuoc -> phan goi y o quay ban tra ve thuoc that.
		const pinnedSkus = [
			...new Set(
				protocols.flatMap((protocol) => protocol.items.map((item) => item.sku)),
			),
		];
		for (const [sortOrder, sku] of pinnedSkus.entries()) {
			const product = productBySku.get(sku);
			if (!product) continue;
			await prisma.diseaseProductPin.upsert({
				where: {
					diseaseId_productId: { diseaseId: disease.id, productId: product.id },
				},
				update: { isExcluded: false, sortOrder },
				create: {
					tenantId,
					diseaseId: disease.id,
					productId: product.id,
					sortOrder,
					isExcluded: false,
				},
			});
		}
	}
	console.log(
		`  [SO TAY] protocols=${protocolCount}, benh bo qua (chua co trong so tay)=${skipped}`,
	);
}

async function ensureByName(
	tenantId: string,
	name: string,
	find: (args: {
		tenantId: string;
		name: string;
	}) => Promise<{ id: string } | null>,
	make: (args: { tenantId: string; name: string }) => Promise<{ id: string }>,
): Promise<string> {
	const found = await find({ tenantId, name });
	if (found) return found.id;
	const created = await make({ tenantId, name });
	return created.id;
}

async function seedTenant(t: DemoTenant): Promise<void> {
	const owner = t.users.find((u) => u.role === 'OWNER');
	if (!owner)
		throw new Error(`Tenant ${t.slug} thieu OWNER trong danh sach users.`);

	// 1) tenant (+ roles + owner neu chua ton tai)
	let tenant = await prisma.tenant.findUnique({
		where: { slug: t.slug },
		select: { id: true },
	});
	let created = false;
	if (!tenant) {
		const id = await provisionTenant(owner, t);
		tenant = { id };
		created = true;
	}
	const tenantId = tenant.id;

	// 2) roles by code
	const roles = await prisma.role.findMany({
		where: { tenantId, code: { in: PER_TENANT_ROLES.map((r) => r.code) } },
		select: { id: true, code: true },
	});
	const roleIdByCode = new Map(roles.map((r) => [r.code, r.id]));

	// 3) users (owner da co neu vua provision; upsert phan con lai + owner cho tenant cu)
	for (const u of t.users) {
		const roleId = roleIdByCode.get(u.role);
		if (!roleId) throw new Error(`Tenant ${t.slug} thieu role ${u.role}.`);
		await ensureUser(tenantId, roleId, u);
	}

	// 4) units
	const unitIdByCode = new Map<string, string>();
	for (const un of UNITS) {
		const unit = await prisma.unit.upsert({
			where: { tenantId_code: { tenantId, code: un.code } },
			update: { name: un.name },
			create: { tenantId, code: un.code, name: un.name },
			select: { id: true },
		});
		unitIdByCode.set(un.code, unit.id);
	}

	// 5) warehouse mac dinh
	const warehouse = await prisma.warehouse.upsert({
		where: { tenantId_code: { tenantId, code: 'DEFAULT' } },
		update: {},
		create: {
			tenantId,
			code: 'DEFAULT',
			name: 'Kho mặc định',
			isDefault: true,
		},
		select: { id: true },
	});

	// 6) danh muc / thuong hieu / nha san xuat
	const categoryIdByName = new Map<string, string>();
	for (const name of CATEGORIES) {
		const id = await ensureByName(
			tenantId,
			name,
			(a) => prisma.category.findFirst({ where: a, select: { id: true } }),
			(a) => prisma.category.create({ data: a, select: { id: true } }),
		);
		categoryIdByName.set(name, id);
	}
	const brandIdByName = new Map<string, string>();
	for (const name of BRANDS) {
		const id = await ensureByName(
			tenantId,
			name,
			(a) => prisma.brand.findFirst({ where: a, select: { id: true } }),
			(a) => prisma.brand.create({ data: a, select: { id: true } }),
		);
		brandIdByName.set(name, id);
	}
	const manufacturerIdByName = new Map<string, string>();
	for (const name of MANUFACTURERS) {
		const id = await ensureByName(
			tenantId,
			name,
			(a) => prisma.manufacturer.findFirst({ where: a, select: { id: true } }),
			(a) => prisma.manufacturer.create({ data: a, select: { id: true } }),
		);
		manufacturerIdByName.set(name, id);
	}

	// 7) san pham + ton kho
	const productsToSeed = t.productSkus
		? PRODUCTS.filter((product) => t.productSkus?.includes(product.sku))
		: PRODUCTS;
	for (const p of productsToSeed) {
		const baseUnitId = unitIdByCode.get(p.unit);
		if (!baseUnitId)
			throw new Error(`San pham ${p.sku}: khong tim thay unit ${p.unit}.`);
		const spec = PRODUCT_SPECS[p.sku];
		const data: Prisma.ProductUncheckedCreateInput = {
			tenantId,
			sku: p.sku,
			name: p.name,
			// Phai dung ban khong dau, khop migration backfill_diacritic_free_search.
			nameSearch: normalizeVietnameseSearch(p.name),
			categoryId: categoryIdByName.get(p.category) ?? null,
			brandId: brandIdByName.get(p.brand) ?? null,
			manufacturerId: p.manufacturer
				? (manufacturerIdByName.get(p.manufacturer) ?? null)
				: null,
			baseUnitId,
			domain: p.domain as Prisma.ProductUncheckedCreateInput['domain'],
			productKind:
				p.productKind as Prisma.ProductUncheckedCreateInput['productKind'],
			businessGroup: ['PESTICIDE', 'FERTILIZER', 'BIOLOGICAL_PRODUCT'].includes(p.productKind) ? 'CROP_INPUTS' : null,
			activeIngredient: p.activeIngredient ?? null,
			concentration: p.concentration ?? null,
			netContent: spec?.netContent ?? null,
			netContentUnit: spec?.netContentUnit ?? null,
			attrs: (spec?.attrs ?? null) as Prisma.ProductUncheckedCreateInput['attrs'],
			costPrice: BigInt(p.cost),
			salePrice: BigInt(p.sale),
			status: 'ACTIVE',
		};
		const product = await prisma.product.upsert({
			where: { tenantId_sku: { tenantId, sku: p.sku } },
			update: {
				name: data.name,
				nameSearch: data.nameSearch,
				categoryId: data.categoryId,
				brandId: data.brandId,
				manufacturerId: data.manufacturerId,
				baseUnitId,
				domain: data.domain,
				productKind: data.productKind,
				businessGroup: data.businessGroup,
				netContent: data.netContent,
				netContentUnit: data.netContentUnit,
				attrs: data.attrs,
				costPrice: data.costPrice,
				salePrice: data.salePrice,
			},
			create: data,
			select: { id: true },
		});
		await prisma.stock.upsert({
			where: {
				warehouseId_productId: {
					warehouseId: warehouse.id,
					productId: product.id,
				},
			},
			update: {},
			create: {
				tenantId,
				warehouseId: warehouse.id,
				productId: product.id,
				qty: p.stock,
				avgCost: BigInt(p.cost),
			},
		});
	}

	console.log(
		`  [${created ? 'MOI ' : 'CO  '}] ${t.name} (slug: ${t.slug}) | users: ${t.users.length} | products: ${productsToSeed.length}`,
	);
	if (t.slug === 'nong-xanh-bvtv') await seedBvtvRelations(tenantId);
	await seedHandbookProtocols(tenantId);
}

async function main() {
	console.log('Seed DEMO — nhieu cua hang + user + san pham:');
	for (const t of TENANTS) {
		await seedTenant(t);
	}
	console.log('\nDang nhap thu (mat khau chung, doi qua SEED_DEMO_PASSWORD):');
	console.log(`  Mat khau : ${DEMO_PASSWORD}`);
	for (const t of TENANTS) {
		const owner = t.users.find((u) => u.role === 'OWNER');
		console.log(`  ${t.slug.padEnd(16)} owner=${owner?.username}`);
	}
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
