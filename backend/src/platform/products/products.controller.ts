import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { TenantAccessTokenGuard } from '../auth/guards/tenant-access-token.guard';
import type { TenantIdentity } from '../auth/token.service';
import {
	RequireFeature,
	RequireQuota,
} from '../entitlements/entitlement.constants';
import { EntitlementsGuard } from '../entitlements/entitlements.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { ProductsService } from './products.service';

interface TenantRequest extends Request {
	user: TenantIdentity;
}

@Controller('tenant/products')
@UseGuards(TenantAccessTokenGuard, EntitlementsGuard)
export class ProductsController {
	constructor(private readonly products: ProductsService) {}

	@Get()
	list(@Req() request: TenantRequest) {
		return this.products.list(request.user.tenantId);
	}

	@Post()
	@RequireFeature('inventory')
	@RequireQuota('maxProducts')
	create(@Req() request: TenantRequest, @Body() dto: CreateProductDto) {
		return this.products.create(request.user.tenantId, dto);
	}
}
