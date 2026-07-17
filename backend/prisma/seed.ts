// Seed du lieu nen tang Phase 1: Feature catalog, Plan, Permission, System Role (OWNER/STAFF).
// Chay: pnpm db:seed  (yeu cau DATABASE_URL tro toi Postgres dang chay)
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
			update: {
				name: p.name,
				price: p.price,
				maxUsers: p.maxUsers,
				maxWarehouses: p.maxWarehouses,
				maxStorageBytes: p.maxStorageBytes,
			},
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

	// System roles (tenantId = null). Phase 1: OWNER (toan quyen), STAFF (han che).
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

	console.log(
		`Seed done: ${FEATURES.length} features, ${PLANS.length} plans, ${permissionIds.length} permissions, roles OWNER/STAFF.`,
	);
}

main()
	.catch((e) => {
		console.error(e);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
