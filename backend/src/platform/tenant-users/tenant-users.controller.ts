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
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import type { AdminIdentity } from '../auth/token.service';
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

interface AuthedRequest extends Request {
	user: AdminIdentity;
}

const uuid = () => new ParseUUIDPipe({ version: '4' });

@Controller('admin/tenants/:tenantId/users')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class TenantUsersController {
	constructor(private readonly service: TenantUsersService) {}

	private ctx(req: AuthedRequest): TenantUserAuditCtx {
		return {
			actorId: req.user.id,
			actorRoleCode: req.user.roleCodes?.join(',') ?? null,
			ipAddress: req.ip,
			userAgent: req.get('user-agent') ?? undefined,
		};
	}

	@Get()
	@RequirePermission('admin.tenant-user:view')
	list(
		@Param('tenantId', uuid()) tenantId: string,
		@Query('page') page?: string,
		@Query('pageSize') pageSize?: string,
	): Promise<ListTenantUsersResult> {
		return this.service.list(tenantId, {
			page: Number.parseInt(page ?? '1', 10) || 1,
			pageSize: Number.parseInt(pageSize ?? '50', 10) || 50,
		});
	}

	@Post()
	@HttpCode(201)
	@RequirePermission('admin.tenant-user:manage')
	create(
		@Param('tenantId', uuid()) tenantId: string,
		@Body() dto: CreateTenantUserDto,
		@Req() req: AuthedRequest,
	): Promise<CreateTenantUserResult> {
		return this.service.create(tenantId, dto, this.ctx(req));
	}

	@Patch(':userId')
	@RequirePermission('admin.tenant-user:manage')
	update(
		@Param('tenantId', uuid()) tenantId: string,
		@Param('userId', uuid()) userId: string,
		@Body() dto: UpdateTenantUserDto,
		@Req() req: AuthedRequest,
	): Promise<TenantUserPublic> {
		return this.service.update(tenantId, userId, dto, this.ctx(req));
	}

	@Patch(':userId/role')
	@RequirePermission('admin.tenant-user:manage')
	changeRole(
		@Param('tenantId', uuid()) tenantId: string,
		@Param('userId', uuid()) userId: string,
		@Body() dto: ChangeTenantUserRoleDto,
		@Req() req: AuthedRequest,
	): Promise<TenantUserPublic> {
		return this.service.changeRole(tenantId, userId, dto, this.ctx(req));
	}

	@Post(':userId/deactivate')
	@HttpCode(200)
	@RequirePermission('admin.tenant-user:manage')
	deactivate(
		@Param('tenantId', uuid()) tenantId: string,
		@Param('userId', uuid()) userId: string,
		@Req() req: AuthedRequest,
	): Promise<TenantUserPublic> {
		return this.service.deactivate(tenantId, userId, this.ctx(req));
	}

	@Post(':userId/reactivate')
	@HttpCode(200)
	@RequirePermission('admin.tenant-user:manage')
	reactivate(
		@Param('tenantId', uuid()) tenantId: string,
		@Param('userId', uuid()) userId: string,
		@Req() req: AuthedRequest,
	): Promise<TenantUserPublic> {
		return this.service.reactivate(tenantId, userId, this.ctx(req));
	}

	@Post(':userId/reset-password')
	@HttpCode(200)
	@RequirePermission('admin.tenant-user:manage')
	resetPassword(
		@Param('tenantId', uuid()) tenantId: string,
		@Param('userId', uuid()) userId: string,
		@Body() dto: ResetTenantUserPasswordDto,
		@Req() req: AuthedRequest,
	): Promise<ResetTenantUserPasswordResult> {
		return this.service.resetPassword(tenantId, userId, dto, this.ctx(req));
	}
}
