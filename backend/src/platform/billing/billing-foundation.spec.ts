import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '../../../..');
const schema = readFileSync(join(root, 'backend/prisma/schema.prisma'), 'utf8');
const seed = readFileSync(
	join(root, 'backend/prisma/seed-admin-rbac.ts'),
	'utf8',
);
const catalogSeed = readFileSync(join(root, 'backend/prisma/seed.ts'), 'utf8');
const migration = readFileSync(
	join(
		root,
		'backend/prisma/migrations/20260719000200_admin_billing_foundation/migration.sql',
	),
	'utf8',
);

describe('admin billing foundation contracts', () => {
	it('keeps manual metadata bounded and nullable', () => {
		expect(schema).toContain('manualReference String? @db.VarChar(200)');
		expect(schema).toContain('reason         String? @db.VarChar(500)');
	});

	it('seeds the canonical billing permission contract idempotently', () => {
		for (const code of [
			'admin.plan:view',
			'admin.plan:edit',
			'admin.plan:activate',
			'admin.subscription:view',
			'admin.subscription:edit',
		])
			expect(seed).toContain(`'${code}'`);
		expect(seed).toContain('permission.upsert');
		expect(seed).toContain("'admin.subscription:view',");
		expect(seed).toContain('rolePermission.deleteMany');
		expect(seed).toContain('BILLING_PERMISSION_CODES');
	});

	it('seeds audit viewing for the intended platform-admin role only', () => {
		expect(seed).toContain("{ resource: 'audit', actions: ['view'] }");
		expect(seed).toContain("'admin.audit:view': 'Xem nhật ký hoạt động'");
		expect(seed).toContain("'admin.audit:view',");
		expect(seed).toMatch(/const SALER_GRANTS[\s\S]*?'admin\.audit:view'/);
		expect(seed).not.toMatch(/const SUPPORT_GRANTS[\s\S]*?'admin\.audit:view'/);
		expect(seed).not.toMatch(/const BILLING_GRANTS[\s\S]*?'admin\.audit:view'/);
		expect(seed).toContain('rolePermission.upsert');
	});

	it('does not overwrite operator-owned plan terms on seed rerun', () => {
		expect(catalogSeed).toContain(
			'// Plans are operator-owned after first creation',
		);
		expect(catalogSeed).toMatch(
			/where: \{ code: p\.code \},[\s\S]*?update: \{\},/,
		);
	});

	it('reports duplicate active/trial rows deterministically without deletion', () => {
		expect(migration).toContain("WHERE \"status\" IN ('ACTIVE', 'TRIALING')");
		expect(migration).toContain('ORDER BY "updatedAt" DESC, "id" DESC');
		expect(migration).toContain('preserve history');
		expect(migration).not.toMatch(/DELETE\s+FROM\s+"subscription"/i);
	});

	it('adds lookup indexes and all billing audit actions', () => {
		expect(schema).toContain('@@index([tenantId, status, updatedAt])');
		expect(schema).toContain(
			'@@index([tenantId, status, startDate, endDate, trialEndsAt])',
		);
		for (const action of [
			'PLAN_CREATE',
			'PLAN_UPDATE',
			'PLAN_ACTIVATE',
			'PLAN_DEACTIVATE',
			'SUBSCRIPTION_ASSIGN',
			'SUBSCRIPTION_CHANGE',
			'SUBSCRIPTION_RENEW',
			'SUBSCRIPTION_CANCEL',
		])
			expect(schema).toContain(`  ${action}`);
	});

	it('preserves the complete additive audit action vocabulary', () => {
		for (const action of [
			'ADMIN_CREATE',
			'ADMIN_UPDATE',
			'ADMIN_DEACTIVATE',
			'ADMIN_REACTIVATE',
			'ADMIN_RESET_PASSWORD',
			'ADMIN_ROLE_ASSIGN',
			'ADMIN_ROLE_REVOKE',
			'ROLE_CREATE',
			'ROLE_UPDATE',
			'ROLE_DELETE',
			'ROLE_PERMISSION_GRANT',
			'ROLE_PERMISSION_REVOKE',
			'LOGIN',
			'LOGOUT',
			'REFRESH_REUSE_DETECTED',
			'TENANT_UPDATE',
			'TENANT_STATUS_CHANGE',
			'TENANT_EXPORT',
			'TENANT_CREATE',
			'USER_CREATE',
			'PLAN_CREATE',
			'PLAN_UPDATE',
			'PLAN_ACTIVATE',
			'PLAN_DEACTIVATE',
			'SUBSCRIPTION_ASSIGN',
			'SUBSCRIPTION_CHANGE',
			'SUBSCRIPTION_RENEW',
			'SUBSCRIPTION_CANCEL',
		]) {
			expect(schema).toContain(`  ${action}`);
		}
	});
});
