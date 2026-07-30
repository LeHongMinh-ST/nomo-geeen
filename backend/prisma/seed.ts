// Seed du lieu nen tang Phase 1: Feature catalog, Plan, Permission, System Role (OWNER/STAFF).
// Chay: pnpm db:seed  (yeu cau DATABASE_URL tro toi Postgres dang chay)

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { existsSync } from 'node:fs';
import {
	normalizeSearchList,
	normalizeVietnameseSearch,
} from '../src/platform/handbook/vietnamese-search';

// Prisma 7: nap .env thu cong (config loader khong tu nap cho ts-node seed).
if (existsSync('.env')) process.loadEnvFile?.('.env');

// Runtime PrismaClient dung driver adapter @prisma/adapter-pg (schema.prisma khong co url).
const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Tham so Argon2id khop PasswordService (src/platform/auth/password.service.ts).
const ARGON2_OPTS: argon2.Options = {
	type: argon2.argon2id,
	memoryCost: 65536,
	timeCost: 3,
	parallelism: 2,
};

// Tao admin dau tien tu env. Bo qua neu thieu env; idempotent (khong ghi de mat khau cu).
async function seedBootstrapAdmin() {
	const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
	const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
	if (!email || !password) {
		console.log('Bootstrap admin skipped (BOOTSTRAP_ADMIN_* not set).');
		return;
	}
	const existing = await prisma.platformAdmin.findUnique({
		where: { email },
	});
	if (existing) {
		console.log(`Bootstrap admin exists, skipped: ${email}`);
		return;
	}
	await prisma.platformAdmin.create({
		data: {
			email,
			passwordHash: await argon2.hash(password, ARGON2_OPTS),
			fullName: 'Platform Super Admin',
			role: 'SUPER_ADMIN',
			status: 'ACTIVE',
		},
	});
	console.log(`Bootstrap admin created: ${email}`);
}

// Feature catalog (3.9 + 15)
const FEATURES = [
	{ code: 'inventory', name: 'Quan ly kho' },
	{ code: 'debt', name: 'Quan ly cong no' },
	{ code: 'batch', name: 'Quan ly lo / han su dung' },
	{ code: 'tax', name: 'Thue' },
	{ code: 'barcode', name: 'Ma vach' },
	{ code: 'quantity_tier_pricing', name: 'Gia theo bac so luong' },
	{ code: 'advanced_mode', name: 'Che do nang cao (da kho, RBAC day du)' },
	{ code: 'product_group:crop_seedlings', name: 'Nhom hang cay trong' },
	{ code: 'product_group:human_drugs', name: 'Nhom hang thuoc dung cho nguoi' },
	{ code: 'product_group:veterinary_drugs', name: 'Nhom hang thuoc thu y' },
	{ code: 'product_group:animal_feed', name: 'Nhom hang thuc an chan nuoi' },
];

// Goi dich vu (3.4): moi goi co day du chuc nang; khac nhau o quota.
const PLANS = [
	{
		code: 'starter',
		name: 'Starter',
		price: 0n,
		maxUsers: 2,
		maxWarehouses: 1,
		maxStorageBytes: 1073741824n, // 1 GB
		features: FEATURES.map((f) => f.code).filter(
			(code) => !code.startsWith('product_group:'),
		),
	},
	{
		code: 'professional',
		name: 'Professional',
		price: 199000n,
		maxUsers: 5,
		maxWarehouses: 1,
		maxStorageBytes: 5368709120n, // 5 GB
		features: FEATURES.map((f) => f.code).filter(
			(code) => !code.includes('human_drugs'),
		),
	},
	{
		code: 'enterprise',
		name: 'Enterprise',
		price: 499000n,
		maxUsers: 20,
		maxWarehouses: 5,
		maxStorageBytes: 21474836480n, // 20 GB
		features: FEATURES.map((f) => f.code),
	},
];

// Permission resource:action (architecture.md 6.2)
const RESOURCES = [
	'dashboard',
	'product',
	'purchase',
	'inventory',
	'sales',
	'customer',
	'supplier',
	'debt',
	'report',
	'setting',
	'user',
	'handbook',
];
const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export'];

const HANDBOOK_DEFAULTS = [
	{
		name: 'Đạo ôn',
		aliases: ['cháy lá', 'đạo ôn lá', 'blast'],
		category: 'CROP_PROTECTION_AND_FERTILIZER',
		target: 'Lúa',
		type: 'DISEASE',
		symptom:
			'Vết bệnh hình thoi, tâm xám tro, viền nâu; nặng thì lá cháy khô, bông lép.',
		ingredients: ['Tricyclazole', 'Isoprothiolane'],
	},
	{
		name: 'Rầy nâu',
		aliases: ['rầy', 'cháy rầy'],
		category: 'CROP_PROTECTION_AND_FERTILIZER',
		target: 'Lúa',
		type: 'PEST',
		symptom:
			'Rầy chích hút gốc lúa, cây vàng lụi từng chòm; truyền bệnh vàng lùn.',
		ingredients: ['Fipronil', 'Pymetrozine'],
	},
	{
		name: 'Sâu cuốn lá',
		aliases: ['sâu cuốn lá nhỏ', 'cuốn lá'],
		category: 'CROP_PROTECTION_AND_FERTILIZER',
		target: 'Lúa',
		type: 'PEST',
		symptom:
			'Sâu nhả tơ cuốn lá thành ống, ăn phần thịt lá để lại lớp biểu bì trắng.',
		ingredients: ['Fipronil', 'Chlorantraniliprole'],
	},
	{
		name: 'Cỏ dại ruộng cạn',
		aliases: ['cỏ dại', 'cỏ ruộng'],
		category: 'CROP_PROTECTION_AND_FERTILIZER',
		target: 'Cây trồng cạn',
		type: 'WEED',
		symptom: 'Cỏ mọc dày tranh dinh dưỡng, che sáng cây trồng non.',
		ingredients: ['Paraquat', 'Glyphosate'],
	},
	{
		name: 'Vàng lá gân xanh',
		aliases: ['vàng lá', 'greening'],
		category: 'CROP_PROTECTION_AND_FERTILIZER',
		target: 'Cam quýt',
		type: 'DISEASE',
		symptom: 'Lá vàng loang lổ nhưng gân còn xanh, trái méo lệch, cây suy dần.',
		ingredients: ['Imidacloprid'],
	},
	{
		name: 'Sương mai',
		aliases: ['mốc sương'],
		category: 'CROP_PROTECTION_AND_FERTILIZER',
		target: 'Rau màu',
		type: 'DISEASE',
		symptom:
			'Mặt trên lá đốm vàng, mặt dưới lớp mốc trắng xám; lan nhanh khi ẩm.',
		ingredients: ['Mancozeb', 'Metalaxyl'],
	},
	{
		name: 'Dịch tả lợn',
		aliases: ['dịch tả heo'],
		category: 'VETERINARY_DRUGS',
		target: 'Lợn',
		type: 'OTHER',
		symptom:
			'Lợn sốt cao, bỏ ăn, da đỏ tím vùng tai bụng, chết nhanh hàng loạt.',
		ingredients: [],
	},
	{
		name: 'Cúm gia cầm',
		aliases: ['cúm gà', 'cúm vịt'],
		category: 'VETERINARY_DRUGS',
		target: 'Gà, vịt',
		type: 'OTHER',
		symptom:
			'Gia cầm ủ rũ, khó thở, mào tím, chảy nước mắt mũi, chết đột ngột.',
		ingredients: [],
	},
	{
		name: 'Tụ huyết trùng',
		aliases: ['tụ trùng'],
		category: 'VETERINARY_DRUGS',
		target: 'Trâu, bò',
		type: 'DISEASE',
		symptom:
			'Sốt cao đột ngột, sưng hầu, khó thở, chảy dãi; diễn biến cấp tính.',
		ingredients: ['Oxytetracycline', 'Streptomycin'],
	},
	{
		name: 'Đốm trắng ở tôm',
		aliases: ['đốm trắng', 'WSSV'],
		category: 'UNCATEGORIZED',
		target: 'Tôm',
		type: 'OTHER',
		symptom: 'Tôm giảm ăn, bơi lờ đờ, vỏ xuất hiện đốm trắng; dễ chết nhanh.',
		ingredients: [],
	},
	{
		name: 'Hoại tử gan tụy cấp',
		aliases: ['AHPND', 'gan tụy cấp'],
		category: 'UNCATEGORIZED',
		target: 'Tôm',
		type: 'DISEASE',
		symptom: 'Tôm bỏ ăn, ruột rỗng, gan tụy nhạt màu và teo nhỏ.',
		ingredients: [],
	},
	{
		name: 'Xuất huyết ở cá',
		aliases: ['bệnh đỏ thân', 'đỏ mình'],
		category: 'UNCATEGORIZED',
		target: 'Cá',
		type: 'DISEASE',
		symptom: 'Cá xuất huyết ngoài da, lờ đờ, bỏ ăn và chết rải rác.',
		ingredients: ['Florfenicol', 'Doxycycline'],
	},
	{
		name: 'Chọn giống lúa vụ Đông Xuân',
		aliases: ['giống lúa ĐX', 'chọn giống lúa'],
		category: 'CROP_SEEDLINGS',
		target: 'Lúa',
		type: 'OTHER',
		symptom: 'Chọn giống phù hợp mùa vụ, đất đai và thời gian sinh trưởng.',
		ingredients: [],
	},
	{
		name: 'Chọn cám heo giai đoạn vỗ béo',
		aliases: ['cám heo vỗ béo', 'thức ăn heo'],
		category: 'ANIMAL_FEED',
		target: 'Lợn',
		type: 'OTHER',
		symptom:
			'Chọn khẩu phần đủ năng lượng, đạm và khoáng cho giai đoạn tăng trọng.',
		ingredients: [],
	},
	{
		name: 'Chọn heo giống hậu bị',
		aliases: ['heo giống', 'lợn hậu bị'],
		category: 'LIVESTOCK',
		target: 'Lợn',
		type: 'OTHER',
		symptom:
			'Ưu tiên con giống khỏe mạnh, nguồn gốc rõ ràng, tăng trưởng đồng đều.',
		ingredients: [],
	},
] as const;

const HANDBOOK_DOSAGE_DEFAULTS: Record<string, number> = {
	'Đạo ôn': 1,
	'Rầy nâu': 1,
	'Sâu cuốn lá': 1,
	'Cỏ dại ruộng cạn': 1.5,
};

async function seedDefaultHandbook() {
	const tenants = await prisma.tenant.findMany({ select: { id: true } });
	let created = 0;
	for (const tenant of tenants) {
		for (const item of HANDBOOK_DEFAULTS) {
			const existing = await prisma.disease.findFirst({
				where: { tenantId: tenant.id, name: item.name, deletedAt: null },
				select: { id: true },
			});
			const disease = existing
				? await prisma.disease.findFirstOrThrow({ where: { id: existing.id } })
				: await prisma.disease.create({
						data: {
							tenantId: tenant.id,
							name: item.name,
							// Ban khong dau, khop migration backfill_diacritic_free_search.
							nameSearch: normalizeVietnameseSearch(item.name),
							aliases: [...item.aliases],
							aliasesSearch: normalizeSearchList(item.aliases),
							domain:
								item.category === 'VETERINARY_DRUGS' ||
								item.category === 'ANIMAL_FEED' ||
								item.category === 'LIVESTOCK'
									? 'LIVESTOCK'
									: item.category === 'UNCATEGORIZED'
										? 'GENERAL'
										: 'CROP',
							handbookCategory: item.category,
							target: item.target,
							type: item.type,
							symptom: item.symptom,
							sortOrder: created,
						},
					});
			if (!existing && item.ingredients.length > 0) {
				await prisma.diseaseIngredient.createMany({
					data: item.ingredients.map((activeIngredient, sortOrder) => ({
						tenantId: tenant.id,
						diseaseId: disease.id,
						activeIngredient,
						sortOrder,
					})),
				});
			}
			const dosePerMau = HANDBOOK_DOSAGE_DEFAULTS[item.name];
			if (dosePerMau !== undefined) {
				await prisma.disease.update({
					where: { id: disease.id },
					data: { formulaExpr: 'area_mau * dose_per_mau' },
				});
				await prisma.diseaseConsultField.deleteMany({
					where: { tenantId: tenant.id, diseaseId: disease.id },
				});
				await prisma.diseaseConsultField.createMany({
					data: [
						{
							tenantId: tenant.id,
							diseaseId: disease.id,
							fieldKey: 'area_mau',
							label: 'Quy mô ruộng',
							fieldType: 'SELECT',
							unit: 'mẫu',
							options: {
								choices: [
									{ label: '1 mẫu', value: 1 },
									{ label: '5 mẫu', value: 5 },
									{ label: '10 mẫu', value: 10 },
									{ label: '20 mẫu', value: 20 },
								],
							},
							required: true,
							sortOrder: 0,
						},
						{
							tenantId: tenant.id,
							diseaseId: disease.id,
							fieldKey: 'dose_per_mau',
							label: 'Liều thuốc / mẫu',
							fieldType: 'SELECT',
							unit: 'đơn vị thuốc/mẫu',
							options: {
								choices: [
									{ label: '0,5 đơn vị/mẫu', value: 0.5 },
									{ label: '1 đơn vị/mẫu', value: 1 },
									{ label: '1,5 đơn vị/mẫu', value: 1.5 },
									{ label: '2 đơn vị/mẫu', value: 2 },
								],
								help: 'Chọn theo nhãn thuốc và tình trạng ruộng.',
							},
							required: true,
							sortOrder: 1,
						},
					],
				});
			}
			created += 1;
		}
	}
	console.log(`Handbook defaults ensured: ${created} entries created.`);
}

async function main() {
	// Features
	const featureMap = new Map<string, string>();
	for (const f of FEATURES) {
		const rec = await prisma.feature.upsert({
			where: { code: f.code },
			update: { name: f.name },
			create: { code: f.code, name: f.name },
		});
		featureMap.set(f.code, rec.id);
	}

	// Plans + PlanFeature
	for (const p of PLANS) {
		const plan = await prisma.plan.upsert({
			where: { code: p.code },
			// Plans are operator-owned after first creation; never overwrite
			// billing terms or quotas when the bootstrap seed is rerun.
			update: {},
			create: {
				code: p.code,
				name: p.name,
				price: p.price,
				maxUsers: p.maxUsers,
				maxWarehouses: p.maxWarehouses,
				maxStorageBytes: p.maxStorageBytes,
			},
		});
		for (const fcode of p.features) {
			const featureId = featureMap.get(fcode);
			if (!featureId) continue;
			await prisma.planFeature.upsert({
				where: { planId_featureId: { planId: plan.id, featureId } },
				update: {},
				create: { planId: plan.id, featureId },
			});
		}
	}

	// Permissions
	const permissionIds: string[] = [];
	for (const resource of RESOURCES) {
		for (const action of ACTIONS) {
			const code = `${resource}:${action}`;
			const perm = await prisma.permission.upsert({
				where: { code },
				update: {},
				create: { code, resource, action },
			});
			permissionIds.push(perm.id);
		}
	}

	const debtCollect = await prisma.permission.upsert({
		where: { code: 'debt:collect' },
		update: {},
		create: { code: 'debt:collect', resource: 'debt', action: 'collect' },
	});
	permissionIds.push(debtCollect.id);

	// System roles (tenantId = null). Phase 1: OWNER, MANAGER, STAFF.
	// Luu y: NULL khong dedupe trong unique constraint Postgres => dung findFirst + create,
	// khong upsert tren compound unique [tenantId, code].
	const owner =
		(await prisma.role.findFirst({
			where: { tenantId: null, code: 'OWNER' },
		})) ??
		(await prisma.role.create({
			data: { code: 'OWNER', name: 'Chu cua hang', isSystem: true },
		}));
	const staff =
		(await prisma.role.findFirst({
			where: { tenantId: null, code: 'STAFF' },
		})) ??
		(await prisma.role.create({
			data: { code: 'STAFF', name: 'Nhan vien', isSystem: true },
		}));
	const manager =
		(await prisma.role.findFirst({
			where: { tenantId: null, code: 'MANAGER' },
		})) ??
		(await prisma.role.create({
			data: {
				code: 'MANAGER',
				name: 'Quan ly',
				isSystem: true,
				rank: 2,
			},
		}));
	await prisma.role.update({
		where: { id: owner.id },
		data: { rank: 1, isSystem: true, isAdmin: false },
	});
	await prisma.role.update({
		where: { id: staff.id },
		data: { rank: 3, isSystem: true, isAdmin: false },
	});
	await prisma.role.update({
		where: { id: manager.id },
		data: { rank: 2, isSystem: true, isAdmin: false },
	});

	// OWNER: toan quyen
	for (const permissionId of permissionIds) {
		await prisma.rolePermission.upsert({
			where: { roleId_permissionId: { roleId: owner.id, permissionId } },
			update: {},
			create: { roleId: owner.id, permissionId },
		});
	}

	// STAFF: ban hang / nhap hang / xem khach-cong no; khong sua setting, khong xoa, khong xem report loi nhuan
	const staffPerms = await prisma.permission.findMany({
		where: {
			OR: [
				{
					resource: { in: ['sales', 'purchase', 'product', 'inventory'] },
					action: { in: ['view', 'create', 'edit'] },
				},
				{
					resource: { in: ['customer', 'supplier', 'debt', 'dashboard'] },
					action: 'view',
				},
				{ resource: 'handbook', action: 'view' },
			],
		},
	});
	for (const perm of staffPerms) {
		await prisma.rolePermission.upsert({
			where: {
				roleId_permissionId: { roleId: staff.id, permissionId: perm.id },
			},
			update: {},
			create: { roleId: staff.id, permissionId: perm.id },
		});
	}

	const managerPerms = await prisma.permission.findMany({
		where: {
			OR: [
				{
					resource: { in: ['sales', 'purchase', 'product', 'inventory'] },
					action: { in: ['view', 'create', 'edit'] },
				},
				{
					resource: { in: ['customer', 'supplier', 'debt', 'dashboard'] },
					action: 'view',
				},
				{ resource: 'user', action: { in: ['view', 'create', 'edit'] } },
				{ resource: 'handbook', action: 'view' },
			],
		},
	});
	for (const perm of managerPerms) {
		await prisma.rolePermission.upsert({
			where: {
				roleId_permissionId: { roleId: manager.id, permissionId: perm.id },
			},
			update: {},
			create: { roleId: manager.id, permissionId: perm.id },
		});
	}

	// Sync existing tenant-scoped system roles after adding permissions to the
	// templates. New tenants already clone these grants during provisioning;
	// this keeps older tenants compatible with the current permission catalog.
	const tenantRoles = await prisma.role.findMany({
		where: {
			tenantId: { not: null },
			code: { in: ['OWNER', 'MANAGER', 'STAFF'] },
		},
		select: { id: true, code: true },
	});
	const templatesByCode = new Map([
		['OWNER', owner.id],
		['MANAGER', manager.id],
		['STAFF', staff.id],
	]);
	for (const tenantRole of tenantRoles) {
		const templateId = templatesByCode.get(tenantRole.code);
		if (!templateId) continue;
		const grants = await prisma.rolePermission.findMany({
			where: { roleId: templateId },
			select: { permissionId: true },
		});
		for (const grant of grants) {
			await prisma.rolePermission.upsert({
				where: {
					roleId_permissionId: {
						roleId: tenantRole.id,
						permissionId: grant.permissionId,
					},
				},
				update: {},
				create: { roleId: tenantRole.id, permissionId: grant.permissionId },
			});
		}
	}

	await seedDefaultHandbook();

	console.log(
		`Seed done: ${FEATURES.length} features, ${PLANS.length} plans, ${permissionIds.length} permissions, roles OWNER/MANAGER/STAFF.`,
	);

	await seedBootstrapAdmin();
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
