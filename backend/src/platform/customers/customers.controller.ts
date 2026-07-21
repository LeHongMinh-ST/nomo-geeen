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
import { EntitlementsGuard } from '../entitlements/entitlements.guard';
import { CustomersService } from './customers.service';
import {
	CreateCustomerDto,
	CustomerQueryDto,
	UpdateCustomerDto,
} from './dto/customer.dto';

interface TenantRequest extends Request {
	user: TenantIdentity;
}

@Controller('tenant/customers')
@UseGuards(TenantAccessTokenGuard, TenantPermissionGuard, EntitlementsGuard)
export class CustomersController {
	constructor(private readonly customers: CustomersService) {}
	@Get()
	@RequireTenantPermission('customer:view')
	list(@Req() request: TenantRequest, @Query() query: CustomerQueryDto) {
		return this.customers.list(request.user.tenantId, query);
	}
	@Get(':id')
	@RequireTenantPermission('customer:view')
	detail(@Req() request: TenantRequest, @Param('id') id: string) {
		return this.customers.findById(request.user.tenantId, id);
	}
	@Post()
	@RequireTenantPermission('customer:create')
	create(@Req() request: TenantRequest, @Body() dto: CreateCustomerDto) {
		return this.customers.create(request.user.tenantId, dto);
	}
	@Patch(':id')
	@RequireTenantPermission('customer:edit')
	update(
		@Req() request: TenantRequest,
		@Param('id') id: string,
		@Body() dto: UpdateCustomerDto,
	) {
		return this.customers.update(request.user.tenantId, id, dto);
	}
	@Delete(':id')
	@RequireTenantPermission('customer:delete')
	remove(@Req() request: TenantRequest, @Param('id') id: string) {
		return this.customers.remove(request.user.tenantId, id);
	}
}
