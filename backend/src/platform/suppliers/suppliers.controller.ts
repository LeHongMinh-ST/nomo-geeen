import {
	Body,
	Controller,
	Delete,
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
import {
	CreateSupplierDto,
	SupplierQueryDto,
	UpdateSupplierDto,
} from './dto/supplier.dto';
import { SuppliersService } from './suppliers.service';

interface TenantRequest extends Request {
	user: TenantIdentity;
}
@Controller('tenant/suppliers')
@UseGuards(TenantAccessTokenGuard, TenantPermissionGuard, EntitlementsGuard)
export class SuppliersController {
	constructor(private readonly suppliers: SuppliersService) {}
	@Get() @RequireTenantPermission('supplier:view') list(
		@Req() request: TenantRequest,
		@Query() query: SupplierQueryDto,
	) {
		return this.suppliers.list(request.user.tenantId, query);
	}
	@Get(':id') @RequireTenantPermission('supplier:view') detail(
		@Req() request: TenantRequest,
		@Param('id') id: string,
	) {
		return this.suppliers.findById(request.user.tenantId, id);
	}
	@Post()
	@RequireTenantPermission('supplier:create')
	@RequireFeature('inventory')
	create(@Req() request: TenantRequest, @Body() dto: CreateSupplierDto) {
		return this.suppliers.create(request.user.tenantId, dto);
	}
	@Patch(':id')
	@RequireTenantPermission('supplier:edit')
	@RequireFeature('inventory')
	update(
		@Req() request: TenantRequest,
		@Param('id') id: string,
		@Body() dto: UpdateSupplierDto,
	) {
		return this.suppliers.update(request.user.tenantId, id, dto);
	}
	@Delete(':id')
	@RequireTenantPermission('supplier:delete')
	@RequireFeature('inventory')
	remove(@Req() request: TenantRequest, @Param('id') id: string) {
		return this.suppliers.remove(request.user.tenantId, id);
	}
}
