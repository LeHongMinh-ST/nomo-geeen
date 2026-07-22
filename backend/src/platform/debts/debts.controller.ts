import {
	Body,
	Controller,
	Get,
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
import { DebtsService } from './debts.service';
import {
	CreateDebtVoucherDto,
	DebtPartyTypeInput,
	DebtQueryDto,
} from './dto/debt.dto';

interface TenantRequest extends Request {
	user: TenantIdentity;
}
@Controller('tenant/debts')
@UseGuards(TenantAccessTokenGuard, TenantPermissionGuard)
export class DebtsController {
	constructor(private readonly debts: DebtsService) {}
	@Get() @RequireTenantPermission('debt:view') list(
		@Req() req: TenantRequest,
		@Query() query: DebtQueryDto,
	) {
		return this.debts.list(req.user.tenantId, query);
	}
	@Get(':partyType/:partyId') @RequireTenantPermission('debt:view') detail(
		@Req() req: TenantRequest,
		@Param('partyType') type: DebtPartyTypeInput,
		@Param('partyId') id: string,
	) {
		return this.debts.detail(req.user.tenantId, type, id);
	}
	@Post('vouchers') @RequireTenantPermission('debt:collect') create(
		@Req() req: TenantRequest,
		@Body() dto: CreateDebtVoucherDto,
	) {
		return this.debts.createVoucher(req.user.tenantId, req.user.id, dto);
	}
}
