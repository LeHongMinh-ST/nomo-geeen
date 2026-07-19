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
	| 'tenant-user'
	| 'billing'
	| 'audit'
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
	| 'manage'
	| 'reply';

// Canonical billing contract currently defines five codes (3 plan + 2 subscription).
export const BILLING_PERMISSION_CODES = [
	'admin.plan:view',
	'admin.plan:edit',
	'admin.plan:activate',
	'admin.subscription:view',
	'admin.subscription:edit',
] as const;

// Resource x applicable actions = one permission code each.
const PERMISSIONS: Array<{ resource: AdminResource; actions: AdminAction[] }> =
	[
		{
			resource: 'user',
			actions: [
				'view',
				'create',
				'edit',
				'delete',
				'deactivate',
				'reactivate',
				'reset_password',
			],
		},
		{ resource: 'role', actions: ['view', 'create', 'edit', 'delete'] },
		{ resource: 'permission', actions: ['view'] },
		{
			resource: 'tenant',
			actions: ['view', 'create', 'edit', 'approve', 'export'],
		},
		{ resource: 'tenant-user', actions: ['view', 'manage'] },
		{ resource: 'billing', actions: ['view', 'edit', 'approve', 'export'] },
		{ resource: 'audit', actions: ['view'] },
		{ resource: 'report', actions: ['view', 'export'] },
		{ resource: 'support', actions: ['view', 'edit', 'reply'] },
	];

const BILLING_PERMISSIONS = [
	{ resource: 'plan', actions: ['view', 'edit', 'activate'] },
	{ resource: 'subscription', actions: ['view', 'edit'] },
];

const ALL_PERMISSION_CODES: string[] = PERMISSIONS.flatMap(
	({ resource, actions }) =>
		actions.map((action) => `admin.${resource}:${action}`),
).concat([...BILLING_PERMISSION_CODES]);

// Vietnamese labels (R7.5+). group = resource (nhom theo resource). Hien thi
// cho admin UI; non-admin permissions khong co label trong phase nay.
const RESOURCE_LABEL_VI: Record<string, string> = {
	user: 'Người dùng',
	role: 'Vai trò',
	permission: 'Quyền hệ thống',
	tenant: 'Cửa hàng',
	'tenant-user': 'Người dùng cửa hàng',
	billing: 'Tài chính',
	audit: 'Nhật ký hoạt động',
	report: 'Báo cáo',
	support: 'Hỗ trợ',
	plan: 'Gói dịch vụ',
	subscription: 'Gói đăng ký',
};

// label cua permission = ten tieng Viet cua resource + action. Seed ghi de
// PERMISSION_LABEL_OVERRIDE khi action co nghĩa rieng (vd: reset_password).
const ACTION_LABEL_VI: Record<string, string> = {
	view: 'Xem',
	create: 'Tạo',
	edit: 'Sửa',
	delete: 'Xoá',
	approve: 'Duyệt',
	export: 'Xuất',
	deactivate: 'Vô hiệu hoá',
	reactivate: 'Kích hoạt lại',
	reset_password: 'Đặt lại mật khẩu',
	manage: 'Quản lý',
	reply: 'Phản hồi',
	activate: 'Kích hoạt',
};

const PERMISSION_LABEL_OVERRIDE: Record<string, string> = {
	'admin.user:view': 'Xem người dùng',
	'admin.user:create': 'Tạo người dùng',
	'admin.user:edit': 'Sửa người dùng',
	'admin.user:delete': 'Xoá người dùng',
	'admin.user:deactivate': 'Vô hiệu hoá người dùng',
	'admin.user:reactivate': 'Kích hoạt lại người dùng',
	'admin.user:reset_password': 'Đặt lại mật khẩu người dùng',
	'admin.role:view': 'Xem vai trò',
	'admin.role:create': 'Tạo vai trò',
	'admin.role:edit': 'Sửa vai trò',
	'admin.role:delete': 'Xoá vai trò',
	'admin.permission:view': 'Xem quyền hệ thống',
	'admin.tenant:view': 'Xem cửa hàng',
	'admin.tenant:create': 'Tạo cửa hàng',
	'admin.tenant:edit': 'Sửa cửa hàng',
	'admin.tenant:approve': 'Duyệt cửa hàng',
	'admin.tenant:export': 'Xuất dữ liệu cửa hàng',
	'admin.tenant-user:view': 'Xem người dùng cửa hàng',
	'admin.tenant-user:manage': 'Quản lý người dùng cửa hàng',
	'admin.billing:view': 'Xem tài chính',
	'admin.billing:edit': 'Sửa hoá đơn',
	'admin.billing:approve': 'Duyệt thanh toán',
	'admin.billing:export': 'Xuất báo cáo tài chính',
	'admin.audit:view': 'Xem nhật ký hoạt động',
	'admin.report:view': 'Xem báo cáo',
	'admin.report:export': 'Xuất báo cáo',
	'admin.support:view': 'Xem yêu cầu hỗ trợ',
	'admin.support:edit': 'Sửa yêu cầu hỗ trợ',
	'admin.support:reply': 'Phản hồi hỗ trợ',
	'admin.plan:view': 'Xem gói dịch vụ',
	'admin.plan:edit': 'Sửa gói dịch vụ',
	'admin.plan:activate': 'Kích hoạt gói dịch vụ',
	'admin.subscription:view': 'Xem gói đăng ký',
	'admin.subscription:edit': 'Sửa gói đăng ký',
};

function labelFor(code: string, resource: string, action: string): string {
	if (PERMISSION_LABEL_OVERRIDE[code]) return PERMISSION_LABEL_OVERRIDE[code];
	const res = RESOURCE_LABEL_VI[resource] ?? resource;
	const act = ACTION_LABEL_VI[action] ?? action;
	return `${act} ${res.toLowerCase()}`;
}

// System role grants (R0-04 step 2).
// SUPER_ADMIN gets ALL admin codes via shortcut at guard layer (R4.2); we DO
// NOT materialize grant rows for SUPER_ADMIN to keep the join light.
// SUPPORT and BILLING get explicit subsets.
// admin-tenant-provisioning (R0-01): SALER owns tenant onboarding + tenant-user
// management. SUPER_ADMIN also covers these via the guard shortcut (no rows).
const SALER_GRANTS: string[] = [
	'admin.tenant:create',
	'admin.tenant-user:view',
	'admin.tenant-user:manage',
	'admin.audit:view',
];
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
	'admin.subscription:view',
];
const BILLING_GRANTS: string[] = [
	'admin.user:view',
	'admin.billing:view',
	'admin.billing:edit',
	'admin.billing:approve',
	'admin.billing:export',
	'admin.report:view',
	...BILLING_PERMISSION_CODES,
];

async function seedPermissions(): Promise<number> {
	const inserted = 0;
	for (const { resource, actions } of PERMISSIONS) {
		for (const action of actions) {
			const code = `admin.${resource}:${action}`;
			const label = labelFor(code, resource, action);
			const result = await prisma.permission.upsert({
				where: { code },
				update: { label, group: resource },
				create: { code, resource, action, label, group: resource },
			});
			void result;
		}
	}
	for (const { resource, actions } of BILLING_PERMISSIONS) {
		for (const action of actions) {
			const code = `admin.${resource}:${action}`;
			const label = labelFor(code, resource, action);
			await prisma.permission.upsert({
				where: { code },
				update: { label, group: resource },
				create: { code, resource, action, label, group: resource },
			});
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

	// Reconcile only the canonical billing permissions. Other role grants
	// (tenant/RBAC/support permissions) are owned by their existing seeds.
	const billingPermissionRows = await prisma.permission.findMany({
		where: { code: { in: [...BILLING_PERMISSION_CODES] } },
		select: { id: true },
	});
	if (billingPermissionRows.length > 0) {
		await prisma.rolePermission.deleteMany({
			where: {
				roleId: role.id,
				permissionId: { in: billingPermissionRows.map(({ id }) => id) },
			},
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

	console.log(
		'[seed-admin-rbac] Seeding system roles SUPER_ADMIN, SALER, SUPPORT, BILLING...',
	);
	await seedSystemRole(SUPER_ADMIN_ROLE_CODE, 'Toan quyen', []);
	await seedSystemRole('SALER', 'Kinh doanh', SALER_GRANTS);
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
