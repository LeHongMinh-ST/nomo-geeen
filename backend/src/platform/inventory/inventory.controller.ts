import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RequireTenantPermission } from '../auth/decorators/require-tenant-permission.decorator';
import { TenantAccessTokenGuard } from '../auth/guards/tenant-access-token.guard';
import { TenantPermissionGuard } from '../auth/guards/tenant-permission.guard';
import type { TenantIdentity } from '../auth/token.service';
import { RequireFeature } from '../entitlements/entitlement.constants';
import { EntitlementsGuard } from '../entitlements/entitlements.guard';
import { InventoryService } from './inventory.service';

interface TenantRequest extends Request {
	user: TenantIdentity;
}
@Controller('tenant/inventory')
@UseGuards(TenantAccessTokenGuard, TenantPermissionGuard, EntitlementsGuard)
export class InventoryController {
	constructor(private readonly inventory: InventoryService) {}
	@Get()
	@RequireTenantPermission('inventory:view')
	@RequireFeature('inventory')
	list(
		@Req() req: TenantRequest,
		@Query() query: { page?: number; pageSize?: number; search?: string },
	) {
		return this.inventory.list(req.user.tenantId, query);
	}
	@Get(':productId')
	@RequireTenantPermission('inventory:view')
	@RequireFeature('inventory')
	detail(@Req() req: TenantRequest, @Param('productId') productId: string) {
		return this.inventory.detail(req.user.tenantId, productId);
	}
}
