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
import { ComplianceService } from './compliance.service';
import {
	CreateBannedIngredientDto,
	CreateTenantLicenseDto,
	TenantLicenseQueryDto,
	UpdateBannedIngredientDto,
	UpdateTenantLicenseDto,
} from './dto/compliance.dto';

interface TenantRequest extends Request {
	user: TenantIdentity;
}

/** Hồ sơ pháp lý cửa hàng + danh mục hoạt chất cấm do cửa hàng khai báo. */
@Controller('tenant/compliance')
@UseGuards(TenantAccessTokenGuard, TenantPermissionGuard)
export class ComplianceController {
	constructor(private readonly compliance: ComplianceService) {}

	@Get('licenses')
	@RequireTenantPermission('setting:view')
	listLicenses(
		@Req() request: TenantRequest,
		@Query() query: TenantLicenseQueryDto,
	) {
		return this.compliance.listLicenses(request.user.tenantId, query);
	}

	@Post('licenses')
	@RequireTenantPermission('setting:edit')
	createLicense(
		@Req() request: TenantRequest,
		@Body() dto: CreateTenantLicenseDto,
	) {
		return this.compliance.createLicense(request.user.tenantId, dto);
	}

	@Patch('licenses/:id')
	@RequireTenantPermission('setting:edit')
	updateLicense(
		@Req() request: TenantRequest,
		@Param('id') id: string,
		@Body() dto: UpdateTenantLicenseDto,
	) {
		return this.compliance.updateLicense(request.user.tenantId, id, dto);
	}

	@Delete('licenses/:id')
	@RequireTenantPermission('setting:delete')
	removeLicense(@Req() request: TenantRequest, @Param('id') id: string) {
		return this.compliance.removeLicense(request.user.tenantId, id);
	}

	@Get('banned-ingredients')
	@RequireTenantPermission('setting:view')
	listBannedIngredients(@Req() request: TenantRequest) {
		return this.compliance.listBannedIngredients(request.user.tenantId);
	}

	@Post('banned-ingredients')
	@RequireTenantPermission('setting:edit')
	createBannedIngredient(
		@Req() request: TenantRequest,
		@Body() dto: CreateBannedIngredientDto,
	) {
		return this.compliance.createBannedIngredient(request.user.tenantId, dto);
	}

	@Patch('banned-ingredients/:id')
	@RequireTenantPermission('setting:edit')
	updateBannedIngredient(
		@Req() request: TenantRequest,
		@Param('id') id: string,
		@Body() dto: UpdateBannedIngredientDto,
	) {
		return this.compliance.updateBannedIngredient(
			request.user.tenantId,
			id,
			dto,
		);
	}

	@Delete('banned-ingredients/:id')
	@RequireTenantPermission('setting:delete')
	removeBannedIngredient(
		@Req() request: TenantRequest,
		@Param('id') id: string,
	) {
		return this.compliance.removeBannedIngredient(request.user.tenantId, id);
	}
}
