import { Controller, Get, UseGuards } from '@nestjs/common';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AdminDashboardDataService } from './admin-dashboard-data.service';

@Controller('admin/dashboard')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class AdminDashboardDataController {
	constructor(private readonly dashboard: AdminDashboardDataService) {}

	@Get('summary')
	@RequirePermission('admin.system:view')
	getSummary() {
		return this.dashboard.getSummary();
	}
}
