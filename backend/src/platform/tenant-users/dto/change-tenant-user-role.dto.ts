import { Exclude, Expose } from 'class-transformer';
import { IsIn } from 'class-validator';
import {
	TENANT_ROLE_CODES,
	type TenantRoleCode,
} from './create-tenant-user.dto';

/**
 * PATCH /admin/tenants/:tenantId/users/:userId/role body. Role change is a
 * dedicated endpoint (never reachable via the field-edit whitelist). Target
 * role must be one of the three seeded per-tenant roles.
 */
@Exclude()
export class ChangeTenantUserRoleDto {
	@Expose()
	@IsIn(TENANT_ROLE_CODES)
	roleCode!: TenantRoleCode;
}
