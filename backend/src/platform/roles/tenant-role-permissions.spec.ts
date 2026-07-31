import {
	resolveTenantRolePermissionCodes,
	TENANT_ROLE_PERMISSION_CODES,
} from './tenant-role-permissions';

describe('tenant role permission matrix', () => {
	const allCodes = [
		'dashboard:view',
		'product:view',
		'product:edit',
		'sales:create',
		'report:view',
		'setting:edit',
	];

	it('gives OWNER the complete tenant catalog', () => {
		expect(resolveTenantRolePermissionCodes('OWNER', allCodes)).toEqual(
			allCodes,
		);
	});

	it('keeps MANAGER operational and able to manage tenant users', () => {
		expect(TENANT_ROLE_PERMISSION_CODES.MANAGER).toEqual(
			expect.arrayContaining([
				'product:edit',
				'debt:collect',
				'report:view',
				'user:create',
				'handbook:edit',
			]),
		);
		expect(TENANT_ROLE_PERMISSION_CODES.MANAGER).not.toContain('setting:edit');
	});

	it('keeps STAFF read-only for master data and without elevated functions', () => {
		const staff = resolveTenantRolePermissionCodes('STAFF', allCodes);
		expect(staff).toEqual(
			expect.arrayContaining([
				'dashboard:view',
				'product:view',
				'sales:create',
				'debt:view',
			]),
		);
		expect(staff).not.toContain('product:edit');
		expect(staff).not.toContain('report:view');
		expect(staff).not.toContain('setting:edit');
		expect(staff).not.toContain('user:create');
		expect(staff).not.toContain('debt:collect');
	});
});
