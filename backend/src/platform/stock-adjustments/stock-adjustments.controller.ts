import {
	Body,
	Controller,
	Get,
	HttpCode,
	Param,
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
import { AdjustmentQueryDto } from './dto/adjustment-query.dto';
import { CreateAdjustmentDto } from './dto/create-adjustment.dto';
import { StockAdjustmentsService } from './stock-adjustments.service';

interface TenantRequest extends Request {
	user: TenantIdentity;
}

@Controller('tenant/stock-adjustments')
@UseGuards(TenantAccessTokenGuard, TenantPermissionGuard, EntitlementsGuard)
export class StockAdjustmentsController {
	constructor(private readonly adjustments: StockAdjustmentsService) {}

	@Get()
	@RequireTenantPermission('inventory:view')
	@RequireFeature('inventory')
	list(@Req() req: TenantRequest, @Query() query: AdjustmentQueryDto) {
		return this.adjustments.list(req.user.tenantId, query);
	}

	@Get(':id')
	@RequireTenantPermission('inventory:view')
	@RequireFeature('inventory')
	detail(@Req() req: TenantRequest, @Param('id') id: string) {
		return this.adjustments.findById(req.user.tenantId, id);
	}

	@Post()
	@HttpCode(201)
	@RequireTenantPermission('inventory:edit')
	@RequireFeature('inventory')
	create(@Req() req: TenantRequest, @Body() dto: CreateAdjustmentDto) {
		return this.adjustments.createDraft(req.user.tenantId, req.user.id, dto);
	}

	@Post(':id/complete')
	@RequireTenantPermission('inventory:edit')
	@RequireFeature('inventory')
	complete(@Req() req: TenantRequest, @Param('id') id: string) {
		return this.adjustments.complete(req.user.tenantId, req.user.id, id);
	}
}
