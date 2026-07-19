import {
	Body,
	Controller,
	Get,
	Header,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Query,
	Req,
	Res,
	StreamableFile,
	UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import type { AdminIdentity } from '../auth/token.service';
import { TenantQueryDto } from './dto/tenant-query.dto';
import { TenantStatusTransitionDto } from './dto/tenant-status-transition.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import {
	TenantsService,
	type ListTenantsResult,
	type TenantDetail,
} from './tenants.service';

interface AuthedRequest extends Request {
	user: AdminIdentity;
}

@Controller('admin/tenants')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class TenantsController {
	constructor(private readonly service: TenantsService) {}

	@Get()
	@RequirePermission('admin.tenant:view')
	list(@Query() query: TenantQueryDto): Promise<ListTenantsResult> {
		return this.service.list(query);
	}

	/** Export must be registered before :id to avoid route capture. */
	@Get('export')
	@RequirePermission('admin.tenant:export')
	@Header('Content-Type', 'text/csv; charset=utf-8')
	@Header('Content-Disposition', 'attachment; filename="tenants.csv"')
	async export(
		@Query() query: TenantQueryDto,
		@Req() req: AuthedRequest,
		@Res({ passthrough: true }) res: Response,
	): Promise<StreamableFile> {
		const csv = await this.service.exportCsv(query, {
			actorId: req.user.id,
			actorRoleCode: req.user.roleCodes?.join(',') ?? null,
			ipAddress: req.ip,
			userAgent: req.get('user-agent') ?? undefined,
		});
		res.setHeader('Content-Type', 'text/csv; charset=utf-8');
		return new StreamableFile(Buffer.from(csv, 'utf8'));
	}

	@Get(':id')
	@RequirePermission('admin.tenant:view')
	findOne(
		@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
	): Promise<TenantDetail> {
		return this.service.findById(id);
	}

	@Patch(':id')
	@RequirePermission('admin.tenant:edit')
	update(
		@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
		@Body() dto: UpdateTenantDto,
		@Req() req: AuthedRequest,
	): Promise<TenantDetail> {
		return this.service.update(id, dto, {
			actorId: req.user.id,
			actorRoleCode: req.user.roleCodes?.join(',') ?? null,
			ipAddress: req.ip,
			userAgent: req.get('user-agent') ?? undefined,
		});
	}

	@Post(':id/status')
	@RequirePermission('admin.tenant:approve')
	transitionStatus(
		@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
		@Body() dto: TenantStatusTransitionDto,
		@Req() req: AuthedRequest,
	): Promise<TenantDetail> {
		return this.service.transitionStatus(id, dto, {
			actorId: req.user.id,
			actorRoleCode: req.user.roleCodes?.join(',') ?? null,
			ipAddress: req.ip,
			userAgent: req.get('user-agent') ?? undefined,
		});
	}
}
