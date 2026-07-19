import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Req,
	UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import type { AdminIdentity } from '../auth/token.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import {
	RolesService,
	type PermissionPublicShape,
	type RolePublicShape,
} from './roles.service';

interface AuthedRequest extends Request {
	user: AdminIdentity;
}

@Controller('admin/permissions')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class PermissionsController {
	constructor(private readonly service: RolesService) {}

	@Get()
	@RequirePermission('admin.permission:view')
	list(): Promise<PermissionPublicShape[]> {
		return this.service.listPermissions();
	}
}

@Controller('admin/roles')
@UseGuards(AccessTokenGuard, PermissionGuard)
export class RolesController {
	constructor(private readonly service: RolesService) {}

	@Get()
	@RequirePermission('admin.role:view')
	list(): Promise<RolePublicShape[]> {
		return this.service.list();
	}

	@Post()
	@RequirePermission('admin.role:create')
	@HttpCode(201)
	create(
		@Body() dto: CreateRoleDto,
		@Req() req: AuthedRequest,
	): Promise<RolePublicShape> {
		return this.service.create(dto, {
			actorId: req.user.id,
			actorRoleCode: req.user.roleCodes?.join(',') ?? null,
			ipAddress: req.ip,
			userAgent: req.get('user-agent') ?? undefined,
		});
	}

	@Get(':id')
	@RequirePermission('admin.role:view')
	findOne(
		@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
	): Promise<RolePublicShape> {
		return this.service.findById(id);
	}

	@Patch(':id')
	@RequirePermission('admin.role:edit')
	update(
		@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
		@Body() dto: UpdateRoleDto,
		@Req() req: AuthedRequest,
	): Promise<RolePublicShape> {
		return this.service.update(id, dto, {
			actorId: req.user.id,
			actorRoleCode: req.user.roleCodes?.join(',') ?? null,
			ipAddress: req.ip,
			userAgent: req.get('user-agent') ?? undefined,
		});
	}

	@Delete(':id')
	@RequirePermission('admin.role:delete')
	@HttpCode(204)
	async remove(
		@Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
		@Req() req: AuthedRequest,
	): Promise<void> {
		await this.service.remove(id, {
			actorId: req.user.id,
			actorRoleCode: req.user.roleCodes?.join(',') ?? null,
			ipAddress: req.ip,
			userAgent: req.get('user-agent') ?? undefined,
		});
	}
}
