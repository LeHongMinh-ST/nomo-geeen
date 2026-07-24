import {
	Body,
	Controller,
	HttpCode,
	Param,
	Patch,
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
import { ChangeLivestockStateDto } from './dto/change-livestock-state.dto';
import { LivestockStateService } from './livestock-state.service';

interface TenantRequest extends Request {
	user: TenantIdentity;
}

@Controller('tenant/inventory')
@UseGuards(TenantAccessTokenGuard, TenantPermissionGuard, EntitlementsGuard)
export class LivestockStateController {
	constructor(private readonly livestockState: LivestockStateService) {}

	/**
	 * Change ProductBatch livestock health state.
	 * POST/PATCH under tenant inventory; tenantId from access token only.
	 */
	@Patch('batches/:batchId/health-state')
	@HttpCode(200)
	@RequireTenantPermission('inventory:edit')
	@RequireFeature('inventory')
	changeHealthState(
		@Req() req: TenantRequest,
		@Param('batchId') batchId: string,
		@Body() dto: ChangeLivestockStateDto,
	) {
		return this.livestockState.changeState(
			req.user.tenantId,
			req.user.id,
			batchId,
			{
				toState: dto.toState,
				expectedVersion: dto.expectedVersion,
				reason: dto.reason,
				note: dto.note,
			},
		);
	}
}
