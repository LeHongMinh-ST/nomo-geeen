import { BadRequestException } from '@nestjs/common';
import {
	assertPermissionsMatchRoleScope,
	isAdminPermissionCode,
} from './role-permission-scope';

describe('role-permission-scope', () => {
	describe('isAdminPermissionCode', () => {
		it('returns true only for admin.* codes', () => {
			expect(isAdminPermissionCode('admin.tenant:view')).toBe(true);
			expect(isAdminPermissionCode('product:view')).toBe(false);
			expect(isAdminPermissionCode('admin')).toBe(false);
		});
	});

	describe('assertPermissionsMatchRoleScope', () => {
		it('allows empty permission lists for both scopes', () => {
			expect(() =>
				assertPermissionsMatchRoleScope({
					isAdminRole: true,
					permissionCodes: [],
				}),
			).not.toThrow();
			expect(() =>
				assertPermissionsMatchRoleScope({
					isAdminRole: false,
					permissionCodes: [],
				}),
			).not.toThrow();
		});

		it('allows admin roles with only admin.* codes', () => {
			expect(() =>
				assertPermissionsMatchRoleScope({
					isAdminRole: true,
					permissionCodes: ['admin.role:view', 'admin.tenant:edit'],
				}),
			).not.toThrow();
		});

		it('rejects tenant codes attached to admin roles', () => {
			expect(() =>
				assertPermissionsMatchRoleScope({
					isAdminRole: true,
					permissionCodes: ['admin.role:view', 'product:view'],
				}),
			).toThrow(BadRequestException);
			try {
				assertPermissionsMatchRoleScope({
					isAdminRole: true,
					permissionCodes: ['admin.role:view', 'product:view'],
				});
			} catch (err) {
				expect((err as BadRequestException).getResponse()).toEqual(
					expect.objectContaining({
						reason: 'CROSS_SCOPE_PERMISSION',
						invalid: ['product:view'],
					}),
				);
			}
		});

		it('allows tenant roles with only non-admin codes', () => {
			expect(() =>
				assertPermissionsMatchRoleScope({
					isAdminRole: false,
					permissionCodes: ['product:view', 'sales:create'],
				}),
			).not.toThrow();
		});

		it('rejects admin.* codes attached to tenant roles', () => {
			expect(() =>
				assertPermissionsMatchRoleScope({
					isAdminRole: false,
					permissionCodes: ['product:view', 'admin.tenant:view'],
				}),
			).toThrow(BadRequestException);
			try {
				assertPermissionsMatchRoleScope({
					isAdminRole: false,
					permissionCodes: ['product:view', 'admin.tenant:view'],
				});
			} catch (err) {
				expect((err as BadRequestException).getResponse()).toEqual(
					expect.objectContaining({
						reason: 'CROSS_SCOPE_PERMISSION',
						invalid: ['admin.tenant:view'],
					}),
				);
			}
		});
	});
});
