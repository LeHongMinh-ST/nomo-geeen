// Seed du lieu nen tang Phase 1: Feature catalog, Plan, Permission, System Role (OWNER/STAFF).
// Chay: pnpm db:seed  (yeu cau DATABASE_URL tro toi Postgres dang chay)

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

// Prisma 7: nap .env thu cong (config loader khong tu nap cho ts-node seed).
process.loadEnvFile?.('.env');

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
];

// Goi dich vu (3.4)
const PLANS = [
	{
		code: 'starter',
		name: 'Starter',
		price: 0n,
		maxUsers: 2,
		maxWarehouses: 1,
		maxStorageBytes: 1073741824n, // 1 GB
		features: ['inventory', 'debt', 'quantity_tier_pricing'],
	},
	{
		code: 'professional',
		name: 'Professional',
		price: 199000n,
		maxUsers: 5,
		maxWarehouses: 1,
		maxStorageBytes: 5368709120n, // 5 GB
		features: [
			'inventory',
			'debt',
			'batch',
			'tax',
			'barcode',
			'quantity_tier_pricing',
		],
	},
	{
		code: 'enterprise',
		name: 'Enterprise',
		price: 499000n,
		maxUsers: 20,
		maxWarehouses: 5,
		maxStorageBytes: 21474836480n, // 20 GB
		features: FEATURES.map((f) => f.code), // full, gom advanced_mode
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
];
const ACTIONS = ['view', 'create', 'edit', 'delete', 'approve', 'export'];

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
