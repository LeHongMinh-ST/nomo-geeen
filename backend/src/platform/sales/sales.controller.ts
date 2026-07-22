import {
	Body,
	Controller,
	Get,
	HttpCode,
	Param,
	Query,
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
import { CompleteSalesOrderDto } from './dto/complete-sales-order.dto';
import { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import { SalesOrderQueryDto } from './dto/sales-order-query.dto';
import { SalesService } from './sales.service';

interface TenantRequest extends Request {
	user: TenantIdentity;
}

@Controller('tenant/sales')
@UseGuards(TenantAccessTokenGuard, TenantPermissionGuard, EntitlementsGuard)
export class SalesController {
	constructor(private readonly sales: SalesService) {}

	@Get('orders')
	@RequireTenantPermission('sales:view')
	@RequireFeature('advanced_mode')
	listOrders(
		@Req() request: TenantRequest,
		@Query() query: SalesOrderQueryDto,
	) {
		return this.sales.listOrders(request.user.tenantId, query);
	}

	@Get('orders/:id')
	@RequireTenantPermission('sales:view')
	@RequireFeature('advanced_mode')
	findOrder(@Req() request: TenantRequest, @Param('id') id: string) {
		return this.sales.findOrder(request.user.tenantId, id);
	}

	@Post('orders')
	@HttpCode(201)
	@RequireTenantPermission('sales:create')
	@RequireFeature('advanced_mode')
	createOrder(@Req() request: TenantRequest, @Body() dto: CreateSalesOrderDto) {
		return this.sales.createOrder(request.user.tenantId, request.user.id, dto);
	}

	@Post('orders/:id/complete')
	@RequireTenantPermission('sales:edit')
	@RequireFeature('advanced_mode')
	completeOrder(
		@Req() request: TenantRequest,
		@Param('id') id: string,
		@Body() dto: CompleteSalesOrderDto,
	) {
		return this.sales.completeOrder(
			request.user.tenantId,
			request.user.id,
			id,
			dto,
		);
	}

	@Post('orders/:id/cancel')
	@RequireTenantPermission('sales:edit')
	@RequireFeature('advanced_mode')
	cancelOrder(@Req() request: TenantRequest, @Param('id') id: string) {
		return this.sales.cancelOrder(
			request.user.tenantId,
			request.user.id,
			id,
		);
	}

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
