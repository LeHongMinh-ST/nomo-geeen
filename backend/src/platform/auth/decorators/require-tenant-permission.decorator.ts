import { SetMetadata } from '@nestjs/common';

export const TENANT_PERMISSIONS_KEY = 'tenant_permissions';

export const RequireTenantPermission = (
	...codes: string[]
): MethodDecorator & ClassDecorator =>
	SetMetadata(TENANT_PERMISSIONS_KEY, codes);
