import {
	Body,
	Controller,
	Get,
	Param,
	Patch,
	Post,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequireTenantPermission } from '../auth/decorators/require-tenant-permission.decorator';
import { TenantAccessTokenGuard } from '../auth/guards/tenant-access-token.guard';
import { TenantPermissionGuard } from '../auth/guards/tenant-permission.guard';
import type { TenantIdentity } from '../auth/token.service';
import { RequireFeature } from '../entitlements/entitlement.constants';
import { EntitlementsGuard } from '../entitlements/entitlements.guard';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import {
	CompletePurchaseDto,
	PurchaseQueryDto,
} from './dto/purchase-query.dto';
import { PurchasesService } from './purchases.service';

interface TenantRequest extends Request {
	user: TenantIdentity;
}
@Controller('tenant/purchases')
@UseGuards(TenantAccessTokenGuard, TenantPermissionGuard, EntitlementsGuard)
export class PurchasesController {
	constructor(private readonly purchases: PurchasesService) {}
	@Get()
	@RequireTenantPermission('purchase:view')
	@RequireFeature('inventory')
	list(@Req() req: TenantRequest, @Query() query: PurchaseQueryDto) {
		return this.purchases.list(req.user.tenantId, query);
	}
	@Get(':id')
	@RequireTenantPermission('purchase:view')
	@RequireFeature('inventory')
	detail(@Req() req: TenantRequest, @Param('id') id: string) {
		return this.purchases.findById(req.user.tenantId, id);
	}
	@Post()
	@RequireTenantPermission('purchase:create')
	@RequireFeature('inventory')
	create(@Req() req: TenantRequest, @Body() dto: CreatePurchaseDto) {
		return this.purchases.create(req.user.tenantId, req.user.id, dto);
	}
	@Patch(':id')
	@RequireTenantPermission('purchase:edit')
	@RequireFeature('inventory')
	update(
		@Req() req: TenantRequest,
		@Param('id') id: string,
		@Body() dto: CreatePurchaseDto,
	) {
		return this.purchases.updateDraft(req.user.tenantId, req.user.id, id, dto);
	}
	@Post(':id/complete')
	@RequireTenantPermission('purchase:edit')
	@RequireFeature('inventory')
	complete(
		@Req() req: TenantRequest,
		@Param('id') id: string,
		@Body() dto: CompletePurchaseDto,
	) {
		return this.purchases.complete(
			req.user.tenantId,
			req.user.id,
			id,
			dto.idempotencyKey,
		);
	}
	@Post(':id/cancel')
	@RequireTenantPermission('purchase:edit')
	@RequireFeature('inventory')
	cancel(@Req() req: TenantRequest, @Param('id') id: string) {
		return this.purchases.cancel(req.user.tenantId, id);
	}
}
