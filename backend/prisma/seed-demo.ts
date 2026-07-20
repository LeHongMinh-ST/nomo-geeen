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

// findFirst-then-create cho model khong co unique (tenantId, name).
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
	for (const p of PRODUCTS) {
		const baseUnitId = unitIdByCode.get(p.unit);
		if (!baseUnitId)
			throw new Error(`San pham ${p.sku}: khong tim thay unit ${p.unit}.`);
		const data: Prisma.ProductUncheckedCreateInput = {
			tenantId,
			sku: p.sku,
			name: p.name,
			nameSearch: p.name.toLowerCase(),
			categoryId: categoryIdByName.get(p.category) ?? null,
			brandId: brandIdByName.get(p.brand) ?? null,
			manufacturerId: p.manufacturer
				? (manufacturerIdByName.get(p.manufacturer) ?? null)
				: null,
			baseUnitId,
			domain: p.domain as Prisma.ProductUncheckedCreateInput['domain'],
			productKind:
				p.productKind as Prisma.ProductUncheckedCreateInput['productKind'],
			activeIngredient: p.activeIngredient ?? null,
			concentration: p.concentration ?? null,
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
		`  [${created ? 'MOI ' : 'CO  '}] ${t.name} (slug: ${t.slug}) | users: ${t.users.length} | products: ${PRODUCTS.length}`,
	);
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
