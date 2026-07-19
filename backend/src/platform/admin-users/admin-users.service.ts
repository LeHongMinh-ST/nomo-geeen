import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Inject,
	Injectable,
	Logger,
	NotFoundException,
} from '@nestjs/common';
import { AuditAction, AuditActorType } from '@prisma/client';
import { AuditLogger } from '../audit/audit-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { PasswordService } from '../auth/password.service';
import { RefreshTokenStore } from '../auth/refresh-token.store';
import { CreateAdminDto } from './dto/create-admin.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import {
	SUPER_ADMIN_LOCK_KEY,
	SUPER_ADMIN_ROLE_CODE,
} from './admin.constants';

export interface AdminPublicShape {
	id: string;
	email: string;
	fullName: string;
	status: 'ACTIVE' | 'DISABLED';
	roles: string[];
	permissions: string[];
	lastLoginAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface ListAdminsParams {
	page: number;
	pageSize: number;
}

export interface ListAdminsResult {
	items: AdminPublicShape[];
	total: number;
	page: number;
	pageSize: number;
}

export interface AuditCtx {
	actorId: string;
	actorRoleCode: string | null;
	/** Role codes of the acting admin (for privilege gates). */
	actorRoleCodes?: string[];
	ipAddress?: string;
	userAgent?: string;
}

type AdminWithRelations = {
	id: string;
	email: string;
	fullName: string;
	status: 'ACTIVE' | 'DISABLED';
	lastLoginAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
	roleAssignments: Array<{
		role: {
			code: string;
			permissions: Array<{ permission: { code: string } }>;
		};
	}>;
};

const roleInclude = {
	role: {
		include: {
			permissions: {
				include: { permission: true },
			},
		},
	},
} as const;

/** Only platform admin roles (isAdmin + no tenant). */
const adminRoleAssignmentWhere = {
	role: { isAdmin: true, tenantId: null },
} as const;

@Injectable()
export class AdminUsersService {
	private readonly logger = new Logger(AdminUsersService.name);

	constructor(
		@Inject(PrismaService) private readonly prisma: PrismaService,
		private readonly passwords: PasswordService,
		private readonly store: RefreshTokenStore,
		private readonly audit: AuditLogger,
	) {}

	private async toPublicShape(
		admin: AdminWithRelations,
	): Promise<AdminPublicShape> {
		const roles = [...new Set(admin.roleAssignments.map((a) => a.role.code))];
		const permissions = [
			...new Set(
				admin.roleAssignments.flatMap((a) =>
					a.role.permissions.map((rp) => rp.permission.code),
				),
			),
		];
		return {
			id: admin.id,
			email: admin.email,
			fullName: admin.fullName,
			status: admin.status,
			roles,
			permissions,
			lastLoginAt: admin.lastLoginAt?.toISOString() ?? null,
			createdAt: admin.createdAt.toISOString(),
			updatedAt: admin.updatedAt.toISOString(),
		};
	}

	private async loadWithRelations(id: string): Promise<AdminWithRelations> {
		const admin = await this.prisma.platformAdmin.findUnique({
			where: { id },
			include: {
				roleAssignments: {
					where: adminRoleAssignmentWhere,
					include: roleInclude,
				},
			},
		});
		if (!admin) {
			throw new NotFoundException('Admin not found');
		}
		return admin as unknown as AdminWithRelations;
	}

	/**
	 * F-23 / architectural decision #3: sole-SUPER_ADMIN check via assignment
	 * table — count admins with a SUPER_ADMIN role assignment AND status ACTIVE.
	 */
	async countActiveSuperAdmins(
		tx: Pick<PrismaService, 'adminRoleAssignment'> = this.prisma,
	): Promise<number> {
		return tx.adminRoleAssignment.count({
			where: {
				role: {
					code: SUPER_ADMIN_ROLE_CODE,
					isAdmin: true,
					tenantId: null,
				},
				admin: { status: 'ACTIVE' },
			},
		});
	}

	private async isLastActiveSuperAdmin(
		targetId: string,
		tx: Pick<PrismaService, 'adminRoleAssignment'> = this.prisma,
	): Promise<boolean> {
		const target = await tx.adminRoleAssignment.findFirst({
			where: {
				adminId: targetId,
				role: {
					code: SUPER_ADMIN_ROLE_CODE,
					isAdmin: true,
					tenantId: null,
				},
			},
			select: { id: true },
		});
		if (!target) return false;
		const total = await this.countActiveSuperAdmins(tx);
		return total <= 1;
	}

	private actorCodes(ctx: AuditCtx): string[] {
		if (ctx.actorRoleCodes?.length) return ctx.actorRoleCodes;
		if (!ctx.actorRoleCode) return [];
		return ctx.actorRoleCode.split(',').map((c) => c.trim()).filter(Boolean);
	}

	/** Only SUPER_ADMIN may assign the SUPER_ADMIN role. */
	private async assertCanAssignSuperAdmin(
		roleIds: string[],
		ctx: AuditCtx,
	): Promise<void> {
		if (roleIds.length === 0) return;
		const superAdminRole = await this.prisma.role.findFirst({
			where: {
				id: { in: roleIds },
				code: SUPER_ADMIN_ROLE_CODE,
				isAdmin: true,
				tenantId: null,
			},
			select: { id: true },
		});
		if (!superAdminRole) return;
		if (!this.actorCodes(ctx).includes(SUPER_ADMIN_ROLE_CODE)) {
			throw new ForbiddenException({
				reason: 'SUPER_ADMIN_ASSIGN_DENIED',
				message: 'Only SUPER_ADMIN can assign the SUPER_ADMIN role',
			});
		}
	}

	private async validateAdminRoleIds(roleIds: string[]): Promise<void> {
		const foundRoles = await this.prisma.role.findMany({
			where: {
				id: { in: roleIds },
				isAdmin: true,
				tenantId: null,
			},
			select: { id: true },
		});
		if (foundRoles.length !== roleIds.length) {
			throw new BadRequestException({
				reason: 'INVALID_ROLE_ID',
				message: 'One or more roleIds do not exist or are not admin roles',
			});
		}
	}

	/** R3.2 paginated list. */
	async list(params: ListAdminsParams): Promise<ListAdminsResult> {
		const page = Math.max(params.page, 1);
		const pageSize = Math.min(Math.max(params.pageSize, 1), 100);
		const skip = (page - 1) * pageSize;
		const [items, total] = await Promise.all([
			this.prisma.platformAdmin.findMany({
				skip,
				take: pageSize,
				orderBy: { createdAt: 'desc' },
				include: {
					roleAssignments: {
						where: adminRoleAssignmentWhere,
						include: roleInclude,
					},
				},
			}),
			this.prisma.platformAdmin.count(),
		]);
		return {
			items: await Promise.all(
				items.map((i) =>
					this.toPublicShape(i as unknown as AdminWithRelations),
				),
			),
			total,
			page,
			pageSize,
		};
	}

	async findById(id: string): Promise<AdminPublicShape> {
		const admin = await this.loadWithRelations(id);
		return this.toPublicShape(admin);
	}

	private async writeRoleAudit(
		tx: {
			auditLog: {
				create: (args: {
					data: {
						actorType: AuditActorType;
						actorId: string | null;
						actorRoleCode: string | null;
						action: AuditAction;
						resource: string;
						resourceId?: string;
						after?: object;
						before?: object;
						ipAddress?: string;
						userAgent?: string;
					};
				}) => Promise<unknown>;
			};
		},
		ctx: AuditCtx,
		action: typeof AuditAction.ADMIN_ROLE_ASSIGN | typeof AuditAction.ADMIN_ROLE_REVOKE,
		resourceId: string,
		roleId: string,
	): Promise<void> {
		const payload =
			action === AuditAction.ADMIN_ROLE_ASSIGN
				? { after: { roleId } }
				: { before: { roleId } };
		await tx.auditLog.create({
			data: {
				actorType: AuditActorType.PLATFORM_ADMIN,
				actorId: ctx.actorId,
				actorRoleCode: ctx.actorRoleCode,
				action,
				resource: 'platform_admin',
				resourceId,
				...payload,
				ipAddress: ctx.ipAddress,
				userAgent: ctx.userAgent,
			},
		});
	}

	/** R3.1 create. */
	async create(dto: CreateAdminDto, ctx: AuditCtx): Promise<AdminPublicShape> {
		const existing = await this.prisma.platformAdmin.findUnique({
			where: { email: dto.email },
		});
		if (existing) {
			throw new ConflictException({
				reason: 'EMAIL_DUPLICATE',
				message: 'Email already in use',
			});
		}

		await this.validateAdminRoleIds(dto.roleIds);
		await this.assertCanAssignSuperAdmin(dto.roleIds, ctx);

		const passwordHash = await this.passwords.hash(dto.password);

		const created = await this.audit.run(
			{
				actorId: ctx.actorId,
				actorType: AuditActorType.PLATFORM_ADMIN,
				actorRoleCode: ctx.actorRoleCode,
				action: AuditAction.ADMIN_CREATE,
				resource: 'platform_admin',
				after: {
					email: dto.email,
					fullName: dto.fullName,
					roleIds: dto.roleIds,
				},
				ipAddress: ctx.ipAddress,
				userAgent: ctx.userAgent,
			},
			async (tx) => {
				const admin = await tx.platformAdmin.create({
					data: {
						email: dto.email,
						passwordHash,
						fullName: dto.fullName,
						role: 'SUPPORT', // legacy enum back-fill (Phase B drops this)
						status: 'ACTIVE',
					},
				});
				await tx.adminRoleAssignment.createMany({
					data: dto.roleIds.map((roleId) => ({
						adminId: admin.id,
						roleId,
						assignedBy: ctx.actorId,
					})),
				});
				for (const roleId of dto.roleIds) {
					await this.writeRoleAudit(
						tx,
						ctx,
						AuditAction.ADMIN_ROLE_ASSIGN,
						admin.id,
						roleId,
					);
				}
				return admin.id;
			},
		);

		const full = await this.loadWithRelations(created);
		return this.toPublicShape(full);
	}

	/** R3.4 update. Replace role assignments in tx. Blocks sole-SA demote. */
	async update(
		id: string,
		dto: UpdateAdminDto,
		ctx: AuditCtx,
	): Promise<AdminPublicShape> {
		const before = await this.loadWithRelations(id);
		const beforeRoleCodes = before.roleAssignments.map((a) => a.role.code);
		const beforeShape = {
			fullName: before.fullName,
			roleIds: beforeRoleCodes,
		};

		// Resolve current assignment role ids for delta audit (codes alone insufficient).
		const beforeAssignments = await this.prisma.adminRoleAssignment.findMany({
			where: { adminId: id, ...adminRoleAssignmentWhere },
			select: { roleId: true, role: { select: { code: true } } },
		});
		const beforeRoleIds = beforeAssignments.map((a) => a.roleId);

		let newRoleRows: Array<{ id: string; code: string }> = [];
		if (dto.roleIds !== undefined) {
			if (dto.roleIds.length > 0) {
				await this.validateAdminRoleIds(dto.roleIds);
				await this.assertCanAssignSuperAdmin(dto.roleIds, ctx);
				newRoleRows = await this.prisma.role.findMany({
					where: {
						id: { in: dto.roleIds },
						isAdmin: true,
						tenantId: null,
					},
					select: { id: true, code: true },
				});
			}
		}

		const updated = await this.audit.run(
			{
				actorId: ctx.actorId,
				actorType: AuditActorType.PLATFORM_ADMIN,
				actorRoleCode: ctx.actorRoleCode,
				action: AuditAction.ADMIN_UPDATE,
				resource: 'platform_admin',
				resourceId: id,
				before: beforeShape,
				after: {
					fullName: dto.fullName ?? beforeShape.fullName,
					roleIds:
						dto.roleIds !== undefined
							? newRoleRows.map((r) => r.code)
							: beforeShape.roleIds,
				},
				ipAddress: ctx.ipAddress,
				userAgent: ctx.userAgent,
			},
			async (tx) => {
				if (dto.fullName && dto.fullName !== before.fullName) {
					await tx.platformAdmin.update({
						where: { id },
						data: { fullName: dto.fullName },
					});
				}
				if (dto.roleIds !== undefined) {
					// Serialize with deactivate path to prevent sole-SA lockout races.
					await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SUPER_ADMIN_LOCK_KEY})`;
					const hadSa = beforeRoleCodes.includes(SUPER_ADMIN_ROLE_CODE);
					const keepsSa = newRoleRows.some(
						(r) => r.code === SUPER_ADMIN_ROLE_CODE,
					);
					if (
						hadSa &&
						!keepsSa &&
						(await this.isLastActiveSuperAdmin(
							id,
							tx as unknown as PrismaService,
						))
					) {
						throw new ConflictException({
							reason: 'LAST_SUPER_ADMIN',
							message:
								'Cannot remove SUPER_ADMIN from the last active SUPER_ADMIN',
						});
					}

					const nextIds = new Set(dto.roleIds);
					const prevIds = new Set(beforeRoleIds);
					const added = dto.roleIds.filter((rid) => !prevIds.has(rid));
					const removed = beforeRoleIds.filter((rid) => !nextIds.has(rid));

					await tx.adminRoleAssignment.deleteMany({
						where: { adminId: id },
					});
					if (dto.roleIds.length > 0) {
						await tx.adminRoleAssignment.createMany({
							data: dto.roleIds.map((roleId) => ({
								adminId: id,
								roleId,
								assignedBy: ctx.actorId,
							})),
						});
					}
					for (const roleId of added) {
						await this.writeRoleAudit(
							tx,
							ctx,
							AuditAction.ADMIN_ROLE_ASSIGN,
							id,
							roleId,
						);
					}
					for (const roleId of removed) {
						await this.writeRoleAudit(
							tx,
							ctx,
							AuditAction.ADMIN_ROLE_REVOKE,
							id,
							roleId,
						);
					}
				}
				return id;
			},
		);

		const full = await this.loadWithRelations(updated);
		return this.toPublicShape(full);
	}

	/** R3.5 deactivate. F-22 two distinct errors. Advisory lock serializes sole-SA. */
	async deactivate(id: string, ctx: AuditCtx): Promise<void> {
		if (id === ctx.actorId) {
			throw new BadRequestException({
				reason: 'CANNOT_DEACTIVATE_SELF',
				message: 'Admins cannot deactivate themselves',
			});
		}
		const admin = await this.prisma.platformAdmin.findUnique({
			where: { id },
			select: { id: true, status: true },
		});
		if (!admin) {
			throw new NotFoundException('Admin not found');
		}

		await this.audit.run(
			{
				actorId: ctx.actorId,
				actorType: AuditActorType.PLATFORM_ADMIN,
				actorRoleCode: ctx.actorRoleCode,
				action: AuditAction.ADMIN_DEACTIVATE,
				resource: 'platform_admin',
				resourceId: id,
				before: { status: admin.status },
				after: { status: 'DISABLED' },
				ipAddress: ctx.ipAddress,
				userAgent: ctx.userAgent,
			},
			async (tx) => {
				// Serialize sole-SUPER_ADMIN checks across concurrent deactivates.
				await tx.$executeRaw`SELECT pg_advisory_xact_lock(${SUPER_ADMIN_LOCK_KEY})`;
				if (await this.isLastActiveSuperAdmin(id, tx as unknown as PrismaService)) {
					throw new ConflictException({
						reason: 'LAST_SUPER_ADMIN',
						message: 'Cannot deactivate the last active SUPER_ADMIN',
					});
				}
				await tx.platformAdmin.update({
					where: { id },
					data: { status: 'DISABLED' },
				});
			},
		);
	}

	/** R3.6 reactivate. */
	async reactivate(id: string, ctx: AuditCtx): Promise<void> {
		const admin = await this.prisma.platformAdmin.findUnique({
			where: { id },
			select: { id: true, status: true },
		});
		if (!admin) {
			throw new NotFoundException('Admin not found');
		}

		await this.audit.run(
			{
				actorId: ctx.actorId,
				actorType: AuditActorType.PLATFORM_ADMIN,
				actorRoleCode: ctx.actorRoleCode,
				action: AuditAction.ADMIN_REACTIVATE,
				resource: 'platform_admin',
				resourceId: id,
				before: { status: admin.status },
				after: { status: 'ACTIVE' },
				ipAddress: ctx.ipAddress,
				userAgent: ctx.userAgent,
			},
			async (tx) => {
				await tx.platformAdmin.update({
					where: { id },
					data: { status: 'ACTIVE' },
				});
			},
		);
	}

	/** R3.7 / R3.7.a / R3.7.b reset password + revoke sessions. */
	async resetPassword(
		id: string,
		dto: ResetPasswordDto,
		ctx: AuditCtx,
	): Promise<void> {
		if (id === ctx.actorId) {
			throw new BadRequestException({
				reason: 'CANNOT_RESET_OWN_VIA_ADMIN_API',
				message: 'Use change-password flow to reset your own password',
			});
		}
		const admin = await this.prisma.platformAdmin.findUnique({
			where: { id },
			select: { id: true },
		});
		if (!admin) {
			throw new NotFoundException('Admin not found');
		}
		const passwordHash = await this.passwords.hash(dto.newPassword);

		// R6.4 same-tx: passwordHash update inside AuditLogger.run.
		// revokeAllForAdmin is Redis — best-effort after DB commit.
		await this.audit.run(
			{
				actorId: ctx.actorId,
				actorType: AuditActorType.PLATFORM_ADMIN,
				actorRoleCode: ctx.actorRoleCode,
				action: AuditAction.ADMIN_RESET_PASSWORD,
				resource: 'platform_admin',
				resourceId: id,
				after: { passwordReset: true },
				ipAddress: ctx.ipAddress,
				userAgent: ctx.userAgent,
			},
			async (tx) => {
				await tx.platformAdmin.update({
					where: { id },
					data: { passwordHash },
				});
			},
		);

		// R3.7.a: wipe refresh families. Best-effort if Redis is down —
		// access tokens remain valid until TTL (15 min).
		try {
			await this.store.revokeAllForAdmin(id);
		} catch (err) {
			this.logger.warn(
				`revokeAllForAdmin failed after password reset for ${id}: ${
					err instanceof Error ? err.message : String(err)
				}`,
			);
		}
	}
}
