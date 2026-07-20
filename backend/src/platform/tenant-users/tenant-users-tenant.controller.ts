import {
	Body,
	Controller,
	Get,
	HttpCode,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Query,
	Req,
	UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuditActorType } from '@prisma/client';
import { RequireTenantPermission } from '../auth/decorators/require-tenant-permission.decorator';
import { TenantAccessTokenGuard } from '../auth/guards/tenant-access-token.guard';
import { TenantPermissionGuard } from '../auth/guards/tenant-permission.guard';
import type { TenantIdentity } from '../auth/token.service';
import { ChangeTenantUserRoleDto } from './dto/change-tenant-user-role.dto';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { ResetTenantUserPasswordDto } from './dto/reset-tenant-user-password.dto';
import { UpdateTenantUserDto } from './dto/update-tenant-user.dto';
import {
	type CreateTenantUserResult,
	type ListTenantUsersResult,
	type ResetTenantUserPasswordResult,
	type TenantUserAuditCtx,
	type TenantUserPublic,
	TenantUsersService,
} from './tenant-users.service';

interface TenantRequest extends Request {
	user: TenantIdentity;
}

const uuid = () => new ParseUUIDPipe({ version: '4' });

@Controller('tenant/users')
@UseGuards(TenantAccessTokenGuard, TenantPermissionGuard)
export class TenantUsersTenantController {
	constructor(private readonly service: TenantUsersService) {}

	private ctx(req: TenantRequest): TenantUserAuditCtx {
		return {
			actorId: req.user.id,
			actorRoleCode: req.user.roleCode,
			actorType: AuditActorType.USER,
			createdByType: 'USER',
			ipAddress: req.ip,
			userAgent: req.get('user-agent') ?? undefined,
		};
	}

	@Get()
	@RequireTenantPermission('user:view')
	list(
		@Req() req: TenantRequest,
		@Query('page') page?: string,
		@Query('pageSize') pageSize?: string,
	): Promise<ListTenantUsersResult> {
		return this.service.list(req.user.tenantId, {
			page: Number.parseInt(page ?? '1', 10) || 1,
			pageSize: Number.parseInt(pageSize ?? '50', 10) || 50,
		});
	}

	@Post()
	@HttpCode(201)
	@RequireTenantPermission('user:create')
	create(
		@Body() dto: CreateTenantUserDto,
		@Req() req: TenantRequest,
	): Promise<CreateTenantUserResult> {
		return this.service.create(req.user.tenantId, dto, this.ctx(req));
	}

	@Patch(':userId')
	@RequireTenantPermission('user:edit')
	update(
		@Param('userId', uuid()) userId: string,
		@Body() dto: UpdateTenantUserDto,
		@Req() req: TenantRequest,
	): Promise<TenantUserPublic> {
		return this.service.update(req.user.tenantId, userId, dto, this.ctx(req));
	}

	@Patch(':userId/role')
	@RequireTenantPermission('user:edit')
	changeRole(
		@Param('userId', uuid()) userId: string,
		@Body() dto: ChangeTenantUserRoleDto,
		@Req() req: TenantRequest,
	): Promise<TenantUserPublic> {
		return this.service.changeRole(
			req.user.tenantId,
			userId,
			dto,
			this.ctx(req),
		);
	}

	@Post(':userId/deactivate')
	@HttpCode(200)
	@RequireTenantPermission('user:edit')
	deactivate(
		@Param('userId', uuid()) userId: string,
		@Req() req: TenantRequest,
	): Promise<TenantUserPublic> {
		return this.service.deactivate(req.user.tenantId, userId, this.ctx(req));
	}

	@Post(':userId/reactivate')
	@HttpCode(200)
	@RequireTenantPermission('user:edit')
	reactivate(
		@Param('userId', uuid()) userId: string,
		@Req() req: TenantRequest,
	): Promise<TenantUserPublic> {
		return this.service.reactivate(req.user.tenantId, userId, this.ctx(req));
	}

	@Post(':userId/reset-password')
	@HttpCode(200)
	@RequireTenantPermission('user:edit')
	resetPassword(
		@Param('userId', uuid()) userId: string,
		@Body() dto: ResetTenantUserPasswordDto,
		@Req() req: TenantRequest,
	): Promise<ResetTenantUserPasswordResult> {
		return this.service.resetPassword(
			req.user.tenantId,
			userId,
			dto,
			this.ctx(req),
		);
	}
}
