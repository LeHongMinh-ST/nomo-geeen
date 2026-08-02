import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { RequireTenantPermission } from '../auth/decorators/require-tenant-permission.decorator';
import { TenantAccessTokenGuard } from '../auth/guards/tenant-access-token.guard';
import { TenantPermissionGuard } from '../auth/guards/tenant-permission.guard';
import type { TenantIdentity } from '../auth/token.service';
import { RequireFeature } from '../entitlements/entitlement.constants';
import { EntitlementsGuard } from '../entitlements/entitlements.guard';
import {
	ReportBatchLedgerQueryDto,
	ReportRegistrationTraceQueryDto,
} from './dto/report-compliance-query.dto';
import { ReportDateQueryDto } from './dto/report-date-query.dto';
import { ReportStockQueryDto } from './dto/report-stock-query.dto';
import { ReportsService } from './reports.service';

interface TenantRequest extends Request {
	user: TenantIdentity;
}

@Controller('tenant/reports')
@UseGuards(TenantAccessTokenGuard, TenantPermissionGuard, EntitlementsGuard)
export class ReportsController {
	constructor(private readonly reports: ReportsService) {}

	@Get('stock-summary')
	@RequireTenantPermission('report:view', 'inventory:view')
	@RequireFeature('inventory')
	stock(@Req() req: TenantRequest, @Query() query: ReportStockQueryDto) {
		return this.reports.stockSummary(req.user.tenantId, query);
	}

	@Get('sales-summary')
	@RequireTenantPermission('report:view', 'sales:view')
	@RequireFeature('advanced_mode')
	sales(@Req() req: TenantRequest, @Query() query: ReportDateQueryDto) {
		return this.reports.salesSummary(req.user.tenantId, query);
	}

	/** Home dashboard KPIs — core screen, permission dashboard:view only. */
	@Get('home-summary')
	@RequireTenantPermission('dashboard:view')
	home(@Req() req: TenantRequest) {
		return this.reports.homeSummary(req.user.tenantId);
	}

	/** Sổ xuất nhập theo lô — chứng từ đối chiếu khi cơ quan kiểm tra. */
	@Get('batch-ledger')
	@RequireTenantPermission('report:view', 'inventory:view')
	@RequireFeature('inventory')
	batchLedger(
		@Req() req: TenantRequest,
		@Query() query: ReportBatchLedgerQueryDto,
	) {
		return this.reports.batchLedger(req.user.tenantId, query);
	}

	/** Truy xuất sản phẩm theo số đăng ký lưu thông. */
	@Get('registration-trace')
	@RequireTenantPermission('report:view', 'inventory:view')
	@RequireFeature('inventory')
	registrationTrace(
		@Req() req: TenantRequest,
		@Query() query: ReportRegistrationTraceQueryDto,
	) {
		return this.reports.registrationTrace(req.user.tenantId, query);
	}
}
