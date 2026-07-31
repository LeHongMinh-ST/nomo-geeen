import { BadRequestException } from '@nestjs/common';
import { ADMIN_PERMISSION_PREFIX } from '../admin-users/admin.constants';

/** True when a permission code belongs to the platform-admin namespace. */
export function isAdminPermissionCode(code: string): boolean {
	return code.startsWith(ADMIN_PERMISSION_PREFIX);
}

/**
 * Enforce role ↔ permission namespace isolation:
 * - admin roles (isAdmin=true) may only receive admin.* codes
 * - tenant roles (isAdmin=false) must never receive admin.* codes
 *
 * Pure check over already-loaded permission codes — no DB access.
 * Callers load codes (or count with a startsWith filter) before invoking.
 */
export function assertPermissionsMatchRoleScope(params: {
	isAdminRole: boolean;
	permissionCodes: readonly string[];
}): void {
	const { isAdminRole, permissionCodes } = params;
	if (permissionCodes.length === 0) return;

	if (isAdminRole) {
		const nonAdmin = permissionCodes.filter(
			(code) => !isAdminPermissionCode(code),
		);
		if (nonAdmin.length > 0) {
			throw new BadRequestException({
				reason: 'CROSS_SCOPE_PERMISSION',
				message: 'Tenant permissions cannot be attached to admin roles',
				invalid: nonAdmin,
			});
		}
		return;
	}

	const adminCodes = permissionCodes.filter(isAdminPermissionCode);
	if (adminCodes.length > 0) {
		throw new BadRequestException({
			reason: 'CROSS_SCOPE_PERMISSION',
			message: 'Admin permissions cannot be attached to tenant roles',
			invalid: adminCodes,
		});
	}
}
