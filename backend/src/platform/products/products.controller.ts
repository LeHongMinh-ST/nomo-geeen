import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Req,
	UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequireTenantPermission } from '../auth/decorators/require-tenant-permission.decorator';
import { TenantAccessTokenGuard } from '../auth/guards/tenant-access-token.guard';
import { TenantPermissionGuard } from '../auth/guards/tenant-permission.guard';
import type { TenantIdentity } from '../auth/token.service';
import {
	RequireFeature,
	RequireQuota,
} from '../entitlements/entitlement.constants';
import { EntitlementsGuard } from '../entitlements/entitlements.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateBusinessGroupsDto } from './dto/update-business-groups.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

interface TenantRequest extends Request {
	user: TenantIdentity;
}

@Controller('tenant/products')
@UseGuards(TenantAccessTokenGuard, TenantPermissionGuard, EntitlementsGuard)
export class ProductsController {
	constructor(private readonly products: ProductsService) {}

	@Get()
	@RequireTenantPermission('product:view')
	list(@Req() request: TenantRequest) {
		return this.products.list(request.user.tenantId);
	}

	@Get('lookups')
	@RequireTenantPermission('product:view')
	lookups(@Req() request: TenantRequest) {
		return this.products.lookups(request.user.tenantId);
	}

	@Get('business-groups')
	@RequireTenantPermission('product:view')
	businessGroups(@Req() request: TenantRequest) {
		return this.products.businessGroups(request.user.tenantId);
	}

	@Patch('business-groups')
	@RequireTenantPermission('product:edit')
	updateBusinessGroups(
		@Req() request: TenantRequest,
		@Body() dto: UpdateBusinessGroupsDto,
	) {
		return this.products.updateBusinessGroups(
			request.user.tenantId,
			dto.enabledGroups,
		);
	}

	@Get(':id')
	@RequireTenantPermission('product:view')
	detail(@Req() request: TenantRequest, @Param('id') id: string) {
		return this.products.findById(request.user.tenantId, id);
	}

	@Post()
	@RequireTenantPermission('product:create')
	@RequireFeature('inventory')
	@RequireQuota('maxProducts')
	create(@Req() request: TenantRequest, @Body() dto: CreateProductDto) {
		return this.products.create(request.user.tenantId, dto);
	}

	@Patch(':id')
	@RequireTenantPermission('product:edit')
	@RequireFeature('inventory')
	update(
		@Req() request: TenantRequest,
		@Param('id') id: string,
		@Body() dto: UpdateProductDto,
	) {
		return this.products.update(request.user.tenantId, id, dto);
	}

	@Delete(':id')
	@RequireTenantPermission('product:delete')
	@RequireFeature('inventory')
	remove(@Req() request: TenantRequest, @Param('id') id: string) {
		return this.products.remove(request.user.tenantId, id);
	}
}
