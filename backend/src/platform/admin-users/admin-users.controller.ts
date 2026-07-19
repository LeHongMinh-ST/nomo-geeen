import {
	Body,
	Controller,
	DefaultValuePipe,
	Get,
	HttpCode,
	Param,
	ParseIntPipe,
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
import { CreateAdminDto } from './dto/create-admin.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import {
	AdminUsersService,
	type AdminPublicShape,
	type ListAdminsResult,
} from './admin-users.service';

interface AuthedRequest extends Request {
	user: AdminIdentity;
}

@Controller('admin/users')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class AdminUsersController {
	constructor(private readonly service: AdminUsersService) {}

	@Get()
	@RequirePermission('admin.user:view')
	list(
		@Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
		@Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
	): Promise<ListAdminsResult> {
		const safePageSize = Math.min(Math.max(pageSize, 1), 100);
		return this.service.list({ page: Math.max(page, 1), pageSize: safePageSize });
	}

	@Post()
	@RequirePermission('admin.user:create')
	@HttpCode(201)
	create(
		@Body() dto: CreateAdminDto,
		@Req() req: AuthedRequest,
	): Promise<AdminPublicShape> {
		return this.service.create(dto, {
			actorId: req.user.id,
			actorRoleCode: req.user.roleCodes?.join(',') ?? null,
			actorRoleCodes: req.user.roleCodes ?? [],
			ipAddress: req.ip,
			userAgent: req.get('user-agent') ?? undefined,
		});
	}

	@Get(':id')
	@RequirePermission('admin.user:view')
	findOne(
		@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
	): Promise<AdminPublicShape> {
		return this.service.findById(id);
	}

	@Patch(':id')
	@RequirePermission('admin.user:edit')
	update(
		@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
		@Body() dto: UpdateAdminDto,
		@Req() req: AuthedRequest,
	): Promise<AdminPublicShape> {
		return this.service.update(id, dto, {
			actorId: req.user.id,
			actorRoleCode: req.user.roleCodes?.join(',') ?? null,
			actorRoleCodes: req.user.roleCodes ?? [],
			ipAddress: req.ip,
			userAgent: req.get('user-agent') ?? undefined,
		});
	}

	@Post(':id/deactivate')
	@RequirePermission('admin.user:deactivate')
	@HttpCode(204)
	async deactivate(
		@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
		@Req() req: AuthedRequest,
	): Promise<void> {
		await this.service.deactivate(id, {
			actorId: req.user.id,
			actorRoleCode: req.user.roleCodes?.join(',') ?? null,
			ipAddress: req.ip,
			userAgent: req.get('user-agent') ?? undefined,
		});
	}

	@Post(':id/reactivate')
	@RequirePermission('admin.user:reactivate')
	@HttpCode(204)
	async reactivate(
		@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
		@Req() req: AuthedRequest,
	): Promise<void> {
		await this.service.reactivate(id, {
			actorId: req.user.id,
			actorRoleCode: req.user.roleCodes?.join(',') ?? null,
			ipAddress: req.ip,
			userAgent: req.get('user-agent') ?? undefined,
		});
	}

	@Post(':id/reset-password')
	@RequirePermission('admin.user:reset_password')
	@HttpCode(204)
	async resetPassword(
		@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
		@Body() dto: ResetPasswordDto,
		@Req() req: AuthedRequest,
	): Promise<void> {
		await this.service.resetPassword(id, dto, {
			actorId: req.user.id,
			actorRoleCode: req.user.roleCodes?.join(',') ?? null,
			ipAddress: req.ip,
			userAgent: req.get('user-agent') ?? undefined,
		});
	}
}