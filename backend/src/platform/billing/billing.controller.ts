import {
	Body,
	Controller,
	Get,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import type { AdminIdentity } from '../auth/token.service';
import {
	BillingService,
	type ListPlansResult,
	type PlanAuditContext,
	type PlanResponse,
	type SubscriptionResponse,
	type SubscriptionResult,
} from './billing.service';
import { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { CreatePlanDto, PlanQueryDto } from './dto/create-plan.dto';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { RenewSubscriptionDto } from './dto/renew-subscription.dto';
import { SubscriptionQueryDto } from './dto/subscription-query.dto';
import { PlanActivationDto, UpdatePlanDto } from './dto/update-plan.dto';

interface AuthedRequest extends Request {
	user: AdminIdentity;
}

@Controller('admin/tenants/:tenantId/subscription')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class SubscriptionController {
	constructor(private readonly service: BillingService) {}

	@Get()
	@RequirePermission('admin.subscription:view')
	get(
		@Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
		@Query() query: SubscriptionQueryDto,
	): Promise<SubscriptionResult> {
		return this.service.getSubscription(tenantId, query);
	}

	@Post()
	@RequirePermission('admin.subscription:edit')
	assign(
		@Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
		@Body() dto: CreateSubscriptionDto,
		@Req() req: AuthedRequest,
	): Promise<SubscriptionResponse> {
		return this.service.assignSubscription(tenantId, dto, this.context(req));
	}

	@Post('renew')
	@RequirePermission('admin.subscription:edit')
	renew(
		@Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
		@Body() dto: RenewSubscriptionDto,
		@Req() req: AuthedRequest,
	): Promise<SubscriptionResponse> {
		return this.service.renewSubscription(tenantId, dto, this.context(req));
	}

	@Post('cancel')
	@RequirePermission('admin.subscription:edit')
	cancel(
		@Param('tenantId', new ParseUUIDPipe({ version: '4' })) tenantId: string,
		@Body() dto: CancelSubscriptionDto,
		@Req() req: AuthedRequest,
	): Promise<SubscriptionResponse> {
		return this.service.cancelSubscription(tenantId, dto, this.context(req));
	}

	private context(req: AuthedRequest): PlanAuditContext {
		return {
			actorId: req.user.id,
			actorRoleCode: req.user.roleCodes?.join(',') ?? null,
			ipAddress: req.ip,
			userAgent: req.get('user-agent') ?? undefined,
		};
	}
}

@Controller('admin/plans')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class BillingController {
	constructor(private readonly service: BillingService) {}

	@Get()
	@RequirePermission('admin.plan:view')
	list(@Query() query: PlanQueryDto): Promise<ListPlansResult> {
		return this.service.list(query);
	}

	@Post()
	@RequirePermission('admin.plan:edit')
	create(
		@Body() dto: CreatePlanDto,
		@Req() req: AuthedRequest,
	): Promise<PlanResponse> {
		return this.service.create(dto, this.context(req));
	}

	@Get(':id')
	@RequirePermission('admin.plan:view')
	findOne(
		@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
	): Promise<PlanResponse> {
		return this.service.findById(id);
	}

	@Patch(':id')
	@RequirePermission('admin.plan:edit')
	update(
		@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
		@Body() dto: UpdatePlanDto,
		@Req() req: AuthedRequest,
	): Promise<PlanResponse> {
		return this.service.update(id, dto, this.context(req));
	}

	@Post(':id/activation')
	@RequirePermission('admin.plan:activate')
	activate(
		@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
		@Body() dto: PlanActivationDto,
		@Req() req: AuthedRequest,
	): Promise<PlanResponse> {
		return this.service.setActivation(id, dto, this.context(req));
	}

	private context(req: AuthedRequest): PlanAuditContext {
		return {
			actorId: req.user.id,
			actorRoleCode: req.user.roleCodes?.join(',') ?? null,
			ipAddress: req.ip,
			userAgent: req.get('user-agent') ?? undefined,
		};
	}
}
