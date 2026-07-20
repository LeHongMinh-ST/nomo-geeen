import {
	Body,
	Controller,
	HttpCode,
	Post,
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
import { CreateQuickSaleDto } from './dto/create-quick-sale.dto';
import { SalesService } from './sales.service';

interface TenantRequest extends Request {
	user: TenantIdentity;
}

@Controller('tenant/sales')
@UseGuards(TenantAccessTokenGuard, TenantPermissionGuard, EntitlementsGuard)
export class SalesController {
	constructor(private readonly sales: SalesService) {}

	@Post('quick')
	@HttpCode(201)
	@RequireTenantPermission('sales:create')
	@RequireFeature('inventory')
	createQuickSale(
		@Req() request: TenantRequest,
		@Body() dto: CreateQuickSaleDto,
	) {
		return this.sales.createQuickSale(
			request.user.tenantId,
			request.user.id,
			dto,
		);
	}
}
