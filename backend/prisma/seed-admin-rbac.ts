// Seed permissions + admin system roles (R0-04, R1).
//
// Idempotent: re-run safe (permission.upsert keyed on `code`;
// role.upsert keyed on `[tenantId, code]`; RolePermission.upsert
// keyed on `[roleId, permissionId]`).
//
// Codes use `admin.` prefix (F-01) to avoid collision with the 10
// existing tenant permission codes (`dashboard`, `product`, etc.)
// already seeded by `prisma/seed.ts`.
//
// Run: pnpm db:seed:rbac   (or directly: ts-node prisma/seed-admin-rbac.ts)

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import {
	ADMIN_PERMISSION_PREFIX,
	SUPER_ADMIN_ROLE_CODE,
} from '../src/platform/admin-users/admin.constants';

// Prisma 7: nap .env thu cong (config loader khong tu nap cho ts-node seed).
process.loadEnvFile?.('.env');

const prisma = new PrismaClient({
	adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// ============================================================================
// Permission taxonomy (F-01: admin.* prefix)
// ============================================================================

type AdminResource =
	| 'user'
	| 'role'
	| 'permission'
	| 'tenant'
	| 'billing'
	| 'report'
	| 'support';

type AdminAction =
	| 'view'
	| 'create'
	| 'edit'
	| 'delete'
	| 'approve'
	| 'export'
	| 'deactivate'
	| 'reactivate'
	| 'reset_password'
	| 'reply';

// Resource x applicable actions = one permission code each.
const PERMISSIONS: Array<{ resource: AdminResource; actions: AdminAction[] }> = [
	{ resource: 'user', actions: ['view', 'create', 'edit', 'delete', 'deactivate', 'reactivate', 'reset_password'] },
	{ resource: 'role', actions: ['view', 'create', 'edit', 'delete'] },
	{ resource: 'permission', actions: ['view'] },
	{ resource: 'tenant', actions: ['view', 'edit', 'approve', 'export'] },
	{ resource: 'billing', actions: ['view', 'edit', 'approve', 'export'] },
	{ resource: 'report', actions: ['view', 'export'] },
	{ resource: 'support', actions: ['view', 'edit', 'reply'] },
];

const ALL_PERMISSION_CODES: string[] = PERMISSIONS.flatMap(({ resource, actions }) =>
	actions.map((action) => `admin.${resource}:${action}`),
);

// System role grants (R0-04 step 2).
// SUPER_ADMIN gets ALL admin codes via shortcut at guard layer (R4.2); we DO
// NOT materialize grant rows for SUPER_ADMIN to keep the join light.
// SUPPORT and BILLING get explicit subsets.
const SUPPORT_GRANTS: string[] = [
	'admin.user:view',
	'admin.user:edit',
	'admin.role:view',
	'admin.permission:view',
	'admin.billing:view',
	'admin.report:view',
	'admin.support:view',
	'admin.support:edit',
	'admin.support:reply',
	// admin-tenant-management: SUPPORT gets full tenant ops (validate decision)
	'admin.tenant:view',
	'admin.tenant:edit',
	'admin.tenant:approve',
	'admin.tenant:export',
];
const BILLING_GRANTS: string[] = [
	'admin.user:view',
	'admin.billing:view',
	'admin.billing:edit',
	'admin.billing:approve',
	'admin.billing:export',
	'admin.report:view',
];

async function seedPermissions(): Promise<number> {
	let inserted = 0;
	for (const { resource, actions } of PERMISSIONS) {
		for (const action of actions) {
			const code = `admin.${resource}:${action}`;
			const result = await prisma.permission.upsert({
				where: { code },
				update: {},
				create: { code, resource, action },
			});
			// Track inserts (create vs no-op upsert) via _count would require
			// Prisma `omit: undefined`. Simpler: re-count after loop.
			void result;
		}
	}
	void inserted;
	return ALL_PERMISSION_CODES.length;
}

async function seedSystemRole(
	code: string,
	name: string,
	grantedCodes: string[],
): Promise<void> {
	// Per Prisma, NULL does not dedupe on @@unique([tenantId, code]) — use
	// findFirst + create pattern (matches existing seed.ts convention).
	const role =
		(await prisma.role.findFirst({
			where: { tenantId: null, code },
		})) ??
		(await prisma.role.create({
			data: {
				code,
				name,
				tenantId: null,
				isSystem: true,
				isAdmin: true,
			},
		}));

	// Update isAdmin + isSystem (idempotent on re-seed if schema evolved).
	if (!role.isAdmin || !role.isSystem) {
		await prisma.role.update({
			where: { id: role.id },
			data: { isAdmin: true, isSystem: true },
		});
	}

	// Grant permissions (UPSERT on [roleId, permissionId]).
	const granted = await prisma.permission.findMany({
		where: { code: { in: grantedCodes } },
		select: { id: true },
	});
	for (const perm of granted) {
		await prisma.rolePermission.upsert({
			where: {
				roleId_permissionId: { roleId: role.id, permissionId: perm.id },
			},
			update: {},
			create: { roleId: role.id, permissionId: perm.id },
		});
	}
}

async function main(): Promise<void> {
	const nodeEnv = process.env.NODE_ENV ?? 'development';
	if (nodeEnv === 'production') {
		console.error(
			'[seed-admin-rbac] Refusing to run with NODE_ENV=production. Set NODE_ENV=development|staging|test to override.',
		);
		process.exit(2);
	}

	console.log('[seed-admin-rbac] Seeding admin permission catalog...');
	const expectedCount = await seedPermissions();
	const actualCount = await prisma.permission.count({
		where: { code: { startsWith: ADMIN_PERMISSION_PREFIX } },
	});
	console.log(
		`[seed-admin-rbac] Permission rows with admin. prefix: ${actualCount} (expected ${expectedCount})`,
	);

	console.log('[seed-admin-rbac] Seeding system roles SUPER_ADMIN, SALER, SUPPORT, BILLING...');
	await seedSystemRole(SUPER_ADMIN_ROLE_CODE, 'Toan quyen', []);
	await seedSystemRole('SALER', 'Kinh doanh', []);
	await seedSystemRole('SUPPORT', 'Ho tro', SUPPORT_GRANTS);
	await seedSystemRole('BILLING', 'Tai chinh', BILLING_GRANTS);

	const sysRoles = await prisma.role.count({
		where: { tenantId: null, isSystem: true, isAdmin: true },
	});
	console.log(
		`[seed-admin-rbac] System roles (isAdmin=true, isSystem=true, tenantId=null): ${sysRoles} (expected 4)`,
	);

	console.log('[seed-admin-rbac] Done.');
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (err) => {
		console.error('[seed-admin-rbac] FAILED:', err);
		await prisma.$disconnect();
		process.exit(1);
	});
