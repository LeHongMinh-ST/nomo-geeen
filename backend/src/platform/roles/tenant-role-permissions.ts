export const TENANT_ROLE_CODES = ['OWNER', 'MANAGER', 'STAFF'] as const;

export type TenantRoleCode = (typeof TENANT_ROLE_CODES)[number];

/**
 * Phase-1 tenant RBAC matrix.
 *
 * OWNER is represented by null because it receives every tenant permission
 * from the catalog. MANAGER and STAFF are explicit so a new permission cannot
 * silently become available to a lower role.
 */
export const TENANT_ROLE_PERMISSION_CODES: Readonly<
	Record<TenantRoleCode, readonly string[] | null>
> = {
	OWNER: null,
	MANAGER: [
		'dashboard:view',
		'product:view',
		'product:create',
		'product:edit',
		'purchase:view',
		'purchase:create',
		'purchase:edit',
		'inventory:view',
		'inventory:edit',
		'sales:view',
		'sales:create',
		'sales:edit',
		'customer:view',
		'customer:create',
		'customer:edit',
		'supplier:view',
		'supplier:create',
		'supplier:edit',
		'debt:view',
		'debt:collect',
		'report:view',
		'user:view',
		'user:create',
		'user:edit',
		'handbook:view',
		'handbook:create',
		'handbook:edit',
	],
	STAFF: [
		'dashboard:view',
		'product:view',
		'purchase:view',
		'purchase:create',
		'purchase:edit',
		'inventory:view',
		'sales:view',
		'sales:create',
		'sales:edit',
		'customer:view',
		'supplier:view',
		'debt:view',
		'handbook:view',
	],
};

export function resolveTenantRolePermissionCodes(
	roleCode: TenantRoleCode,
	allTenantPermissionCodes: readonly string[],
): string[] {
	const configured = TENANT_ROLE_PERMISSION_CODES[roleCode];
	return configured === null ? [...allTenantPermissionCodes] : [...configured];
}
