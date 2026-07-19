import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditActorType, Prisma } from '@prisma/client';
import { AuditLogger } from '../audit/audit-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { ADMIN_PERMISSION_PREFIX } from '../admin-users/admin.constants';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

export interface PermissionPublicShape {
	id: string;
	code: string;
	resource: string;
	action: string;
}

export interface RolePublicShape {
	id: string;
	code: string;
	name: string;
	isSystem: boolean;
	isAdmin: boolean;
	tenantId: string | null;
	permissions: string[];
	createdAt: string;
	updatedAt: string;
}

export interface AuditCtx {
	actorId: string;
	actorRoleCode: string | null;
	ipAddress?: string;
	userAgent?: string;
}

@Injectable()
export class RolesService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditLogger,
	) {}

	private async toPublicShape(
		role: Prisma.RoleGetPayload<{
			include: { permissions: { include: { permission: true } } };
			omit: { rank: true };
		}>,
	): Promise<RolePublicShape> {
		return {
			id: role.id,
			code: role.code,
			name: role.name,
			isSystem: role.isSystem,
			isAdmin: role.isAdmin,
			tenantId: role.tenantId,
			permissions: role.permissions.map((rp) => rp.permission.code).sort(),
			createdAt: role.createdAt.toISOString(),
			updatedAt: role.updatedAt.toISOString(),
		};
	}

	async listPermissions(): Promise<PermissionPublicShape[]> {
		return this.prisma.permission.findMany({
			where: { code: { startsWith: ADMIN_PERMISSION_PREFIX } },
			orderBy: [{ resource: 'asc' }, { action: 'asc' }],
			select: { id: true, code: true, resource: true, action: true },
		});
	}

	async list(): Promise<RolePublicShape[]> {
		const rows = await this.prisma.role.findMany({
			where: { tenantId: null, isAdmin: true },
			orderBy: { code: 'asc' },
			include: { permissions: { include: { permission: true } } },
			omit: { rank: true },
		});
		return Promise.all(rows.map((role) => this.toPublicShape(role)));
	}

	async findById(id: string): Promise<RolePublicShape> {
		const role = await this.prisma.role.findUnique({
			where: { id },
			include: { permissions: { include: { permission: true } } },
			omit: { rank: true },
		});
		if (!role || !role.isAdmin || role.tenantId !== null) {
			throw new NotFoundException('Role not found');
		}
		return this.toPublicShape(role);
	}

	private async validateAdminPermissionIds(ids: string[]): Promise<void> {
		if (ids.length === 0) return;
		const found = await this.prisma.permission.count({
			where: {
				id: { in: ids },
				code: { startsWith: ADMIN_PERMISSION_PREFIX },
			},
		});
		if (found !== ids.length) {
			throw new BadRequestException({
				reason: 'INVALID_PERMISSION_ID',
				message: 'One or more permissionIds do not exist or are not admin permissions',
			});
		}
	}

	async create(dto: CreateRoleDto, ctx: AuditCtx): Promise<RolePublicShape> {
		await this.validateAdminPermissionIds(dto.permissionIds ?? []);
		return this.audit.run(
			{
				actorId: ctx.actorId,
				actorType: AuditActorType.PLATFORM_ADMIN,
				actorRoleCode: ctx.actorRoleCode,
				action: AuditAction.ROLE_CREATE,
				resource: 'role',
				after: { code: dto.code, name: dto.name, permissionIds: dto.permissionIds ?? [] },
				ipAddress: ctx.ipAddress,
				userAgent: ctx.userAgent,
			},
			async (tx) => {
				const existing = await tx.role.findFirst({
					where: { tenantId: null, code: dto.code },
					select: { id: true },
				});
				if (existing) {
					throw new ConflictException({ reason: 'ROLE_CODE_DUPLICATE', message: `Role code already exists: ${dto.code}` });
				}
				const role = await tx.role.create({
					data: { code: dto.code, name: dto.name, tenantId: null, isAdmin: true, isSystem: false },
				});
				if (dto.permissionIds?.length) {
					await tx.rolePermission.createMany({
						data: dto.permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
					});
				}
				const full = await tx.role.findUniqueOrThrow({
					where: { id: role.id },
					include: { permissions: { include: { permission: true } } },
					omit: { rank: true },
				});
				return this.toPublicShape(full);
			},
		);
	}

	async update(id: string, dto: UpdateRoleDto, ctx: AuditCtx): Promise<RolePublicShape> {
		const existing = await this.prisma.role.findUnique({
			where: { id },
			include: { permissions: { include: { permission: true } } },
			omit: { rank: true },
		});
		if (!existing || !existing.isAdmin || existing.tenantId !== null) {
			throw new NotFoundException('Role not found');
		}
		const beforePermissionIds = existing.permissions.map((rp) => rp.permission.id);
		const current = new Set(beforePermissionIds);
		const addIds = (dto.addPermissionIds ?? []).filter((id) => !current.has(id));
		// removeIds already filtered to current role membership — no re-validate.
		const removeIds = (dto.removePermissionIds ?? []).filter((id) => current.has(id));
		await this.validateAdminPermissionIds(addIds);

		return this.audit.run(
			{
				actorId: ctx.actorId,
				actorType: AuditActorType.PLATFORM_ADMIN,
				actorRoleCode: ctx.actorRoleCode,
				action: AuditAction.ROLE_UPDATE,
				resource: 'role',
				resourceId: id,
				before: { name: existing.name, permissionIds: beforePermissionIds },
				after: {
					name: dto.name ?? existing.name,
					addedPermissionIds: addIds,
					removedPermissionIds: removeIds,
				},
				ipAddress: ctx.ipAddress,
				userAgent: ctx.userAgent,
			},
			async (tx) => {
				if (dto.name && dto.name !== existing.name) {
					await tx.role.update({ where: { id }, data: { name: dto.name } });
				}
				if (addIds.length) {
					await tx.rolePermission.createMany({
						data: addIds.map((permissionId) => ({ roleId: id, permissionId })),
						skipDuplicates: true,
					});
				}
				if (removeIds.length) {
					await tx.rolePermission.deleteMany({
						where: { roleId: id, permissionId: { in: removeIds } },
					});
				}
				// R6.4: GRANT/REVOKE audit rows same-tx as permission mutation.
				for (const permissionId of addIds) {
					await tx.auditLog.create({
						data: {
							actorType: AuditActorType.PLATFORM_ADMIN,
							actorId: ctx.actorId,
							actorRoleCode: ctx.actorRoleCode,
							action: AuditAction.ROLE_PERMISSION_GRANT,
							resource: 'role',
							resourceId: id,
							after: { permissionId },
							ipAddress: ctx.ipAddress,
							userAgent: ctx.userAgent,
						},
					});
				}
				for (const permissionId of removeIds) {
					await tx.auditLog.create({
						data: {
							actorType: AuditActorType.PLATFORM_ADMIN,
							actorId: ctx.actorId,
							actorRoleCode: ctx.actorRoleCode,
							action: AuditAction.ROLE_PERMISSION_REVOKE,
							resource: 'role',
							resourceId: id,
							before: { permissionId },
							ipAddress: ctx.ipAddress,
							userAgent: ctx.userAgent,
						},
					});
				}
				const full = await tx.role.findUniqueOrThrow({
					where: { id },
					include: { permissions: { include: { permission: true } } },
					omit: { rank: true },
				});
				return this.toPublicShape(full);
			},
		);
	}

	async remove(id: string, ctx: AuditCtx): Promise<void> {
		const existing = await this.prisma.role.findUnique({
			where: { id },
			select: { id: true, isSystem: true, isAdmin: true, tenantId: true, code: true },
		});
		if (!existing || !existing.isAdmin || existing.tenantId !== null) throw new NotFoundException('Role not found');
		if (existing.isSystem) throw new BadRequestException({ reason: 'SYSTEM_ROLE_PROTECTED', message: 'System roles cannot be deleted' });
		const assignments = await this.prisma.adminRoleAssignment.count({ where: { roleId: id } });
		if (assignments > 0) throw new ConflictException({ reason: 'ROLE_IN_USE', message: `Role assigned to ${assignments} admin(s); detach before deletion` });
		await this.audit.run(
			{ actorId: ctx.actorId, actorType: AuditActorType.PLATFORM_ADMIN, actorRoleCode: ctx.actorRoleCode, action: AuditAction.ROLE_DELETE, resource: 'role', resourceId: id, before: { code: existing.code }, ipAddress: ctx.ipAddress, userAgent: ctx.userAgent },
			async (tx) => { await tx.role.delete({ where: { id } }); },
		);
	}
}
