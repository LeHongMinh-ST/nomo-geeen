import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import {
	AuditAction,
	AuditActorType,
	Prisma,
	type UserStatus,
} from '@prisma/client';
import { AuditLogger } from '../audit/audit-logger.service';
import { PasswordService } from '../auth/password.service';
import { PrismaService } from '../prisma/prisma.service';
import type { ChangeTenantUserRoleDto } from './dto/change-tenant-user-role.dto';
import type {
	CreateTenantUserDto,
	TenantRoleCode,
} from './dto/create-tenant-user.dto';
import type { ResetTenantUserPasswordDto } from './dto/reset-tenant-user-password.dto';
import type { UpdateTenantUserDto } from './dto/update-tenant-user.dto';

export interface TenantUserAuditCtx {
	actorId: string;
	actorRoleCode: string | null;
	ipAddress?: string;
	userAgent?: string;
}

/** Public tenant-user shape — never exposes passwordHash. */
export interface TenantUserPublic {
	id: string;
	tenantId: string;
	fullName: string;
	username: string;
	phone: string | null;
	email: string | null;
	roleCode: string;
	status: UserStatus;
	mustChangePassword: boolean;
	lastLoginAt: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface SeatUsage {
	activeCount: number;
	effectiveMaxUsers: number;
	planCode: string | null;
	seatBonus: number;
}

export interface ListTenantUsersResult {
	items: TenantUserPublic[];
	page: number;
	pageSize: number;
	total: number;
	seatUsage: SeatUsage;
}

export interface CreateTenantUserResult {
	user: TenantUserPublic;
	generatedPassword: string | null;
}

export interface ResetTenantUserPasswordResult {
	generatedPassword: string | null;
}

const MAX_PAGE_SIZE = 100;

// Prisma `select` yielding exactly TenantUserPublic (+ role relation for code).
const USER_SELECT = {
	id: true,
	tenantId: true,
	fullName: true,
	username: true,
	phone: true,
	email: true,
	status: true,
	mustChangePassword: true,
	lastLoginAt: true,
	createdAt: true,
	updatedAt: true,
	role: { select: { code: true } },
} as const;

type UserRow = Prisma.UserGetPayload<{ select: typeof USER_SELECT }>;

@Injectable()
export class TenantUsersService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly passwords: PasswordService,
		private readonly audit: AuditLogger,
	) {}

	async list(
		tenantId: string,
		opts: { page: number; pageSize: number },
	): Promise<ListTenantUsersResult> {
		await this.requireTenant(tenantId);
		const page = Math.max(opts.page, 1);
		const pageSize = Math.min(Math.max(opts.pageSize, 1), MAX_PAGE_SIZE);

		const [rows, total, seatUsage] = await Promise.all([
			this.prisma.user.findMany({
				where: { tenantId, deletedAt: null },
				select: USER_SELECT,
				orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
				skip: (page - 1) * pageSize,
				take: pageSize,
			}),
			this.prisma.user.count({ where: { tenantId, deletedAt: null } }),
			this.seatUsage(tenantId),
		]);

		return {
			items: rows.map((r) => this.toPublic(r)),
			page,
			pageSize,
			total,
			seatUsage,
		};
	}

	async create(
		tenantId: string,
		dto: CreateTenantUserDto,
		ctx: TenantUserAuditCtx,
	): Promise<CreateTenantUserResult> {
		await this.requireTenant(tenantId);
		const { plaintext, generated } = this.resolvePassword(
			dto.password,
			dto.generatePassword,
		);
		const passwordHash = await this.passwords.hash(plaintext);
		const mustChangePassword = dto.mustChangePassword ?? false;

		try {
			const user = await this.prisma.$transaction(
				async (tx) => {
					// Seat re-checked inside the serializable tx to prevent overrun.
					await this.assertSeatAvailable(tenantId, tx);
					const roleId = await this.resolveRoleId(tenantId, dto.roleCode, tx);
					const created = await tx.user.create({
						data: {
							tenantId,
							username: dto.username,
							email: dto.email ?? null,
							phone: dto.phone ?? null,
							passwordHash,
							mustChangePassword,
							fullName: dto.fullName,
							roleId,
							status: 'ACTIVE',
							createdByType: 'PLATFORM_ADMIN',
							createdById: ctx.actorId,
						},
						select: USER_SELECT,
					});
					// USER_CREATE audit shares the create tx (writeInTx, not run()).
					await this.audit.writeInTx(tx, {
						actorId: ctx.actorId,
						actorType: AuditActorType.PLATFORM_ADMIN,
						actorRoleCode: ctx.actorRoleCode,
						ipAddress: ctx.ipAddress,
						userAgent: ctx.userAgent?.slice(0, 512),
						action: AuditAction.USER_CREATE,
						resource: 'user',
						resourceId: created.id,
						after: {
							tenantId,
							username: created.username,
							roleCode: dto.roleCode,
						},
					});
					return created;
				},
				{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
			);
			return {
				user: this.toPublic(user),
				generatedPassword: generated ? plaintext : null,
			};
		} catch (error) {
			throw this.mapUsernameConflict(error);
		}
	}

	async update(
		tenantId: string,
		userId: string,
		dto: UpdateTenantUserDto,
		_ctx: TenantUserAuditCtx,
	): Promise<TenantUserPublic> {
		await this.requireUserInTenant(tenantId, userId);
		// Redundant-but-explicit allowlist: emit a stable machine reason even
		// though the global forbidNonWhitelisted pipe already rejects extras.
		const data = this.pickAllowedFields(dto);
		if (Object.keys(data).length === 0) {
			throw new BadRequestException({
				reason: 'NO_FIELDS',
				message: 'Provide at least one editable field',
			});
		}
		try {
			const user = await this.prisma.user.update({
				where: { id: userId },
				data,
				select: USER_SELECT,
			});
			return this.toPublic(user);
		} catch (error) {
			throw this.mapUsernameConflict(error);
		}
	}

	async changeRole(
		tenantId: string,
		userId: string,
		dto: ChangeTenantUserRoleDto,
		_ctx: TenantUserAuditCtx,
	): Promise<TenantUserPublic> {
		return this.prisma.$transaction(
			async (tx) => {
				const current = await this.requireUserInTenant(tenantId, userId, tx);
				// Demoting the final active OWNER would orphan the store.
				if (current.role.code === 'OWNER' && dto.roleCode !== 'OWNER') {
					await this.assertNotLastOwner(tenantId, userId, tx);
				}
				const roleId = await this.resolveRoleId(tenantId, dto.roleCode, tx);
				const user = await tx.user.update({
					where: { id: userId },
					data: { roleId },
					select: USER_SELECT,
				});
				return this.toPublic(user);
			},
			{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
		);
	}

	async deactivate(
		tenantId: string,
		userId: string,
		_ctx: TenantUserAuditCtx,
	): Promise<TenantUserPublic> {
		return this.prisma.$transaction(
			async (tx) => {
				const current = await this.requireUserInTenant(tenantId, userId, tx);
				if (current.status === 'DISABLED') {
					return this.toPublic(current);
				}
				if (current.role.code === 'OWNER') {
					await this.assertNotLastOwner(tenantId, userId, tx);
				}
				const user = await tx.user.update({
					where: { id: userId },
					data: { status: 'DISABLED' },
					select: USER_SELECT,
				});
				return this.toPublic(user);
			},
			{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
		);
	}

	async reactivate(
		tenantId: string,
		userId: string,
		_ctx: TenantUserAuditCtx,
	): Promise<TenantUserPublic> {
		return this.prisma.$transaction(
			async (tx) => {
				const current = await this.requireUserInTenant(tenantId, userId, tx);
				if (current.status === 'ACTIVE') {
					return this.toPublic(current);
				}
				// Re-check seat inside the tx: a re-activation consumes a seat.
				await this.assertSeatAvailable(tenantId, tx);
				const user = await tx.user.update({
					where: { id: userId },
					data: { status: 'ACTIVE' },
					select: USER_SELECT,
				});
				return this.toPublic(user);
			},
			{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
		);
	}

	async resetPassword(
		tenantId: string,
		userId: string,
		dto: ResetTenantUserPasswordDto,
		_ctx: TenantUserAuditCtx,
	): Promise<ResetTenantUserPasswordResult> {
		await this.requireUserInTenant(tenantId, userId);
		const { plaintext, generated } = this.resolvePassword(
			dto.newPassword,
			dto.generatePassword,
		);
		const passwordHash = await this.passwords.hash(plaintext);
		await this.prisma.user.update({
			where: { id: userId },
			data: { passwordHash, mustChangePassword: true },
			select: { id: true },
		});
		return { generatedPassword: generated ? plaintext : null };
	}

	// ---- helpers -------------------------------------------------------------

	private async requireTenant(
		tenantId: string,
		client: Prisma.TransactionClient | PrismaService = this.prisma,
	): Promise<void> {
		const tenant = await client.tenant.findFirst({
			where: { id: tenantId, deletedAt: null },
			select: { id: true },
		});
		if (!tenant) {
			throw new NotFoundException({
				reason: 'TENANT_NOT_FOUND',
				message: 'Tenant not found',
			});
		}
	}

	/**
	 * Assert `:userId` belongs to `:tenantId` (cross-tenant access → 404, never
	 * 403, to avoid leaking existence). Returns the row for reuse.
	 */
	private async requireUserInTenant(
		tenantId: string,
		userId: string,
		client: Prisma.TransactionClient | PrismaService = this.prisma,
	): Promise<UserRow> {
		const user = await client.user.findFirst({
			where: { id: userId, tenantId, deletedAt: null },
			select: USER_SELECT,
		});
		if (!user) {
			throw new NotFoundException({
				reason: 'USER_NOT_FOUND',
				message: 'User not found in this tenant',
			});
		}
		return user;
	}

	private async resolveRoleId(
		tenantId: string,
		roleCode: TenantRoleCode,
		client: Prisma.TransactionClient | PrismaService,
	): Promise<string> {
		const role = await client.role.findFirst({
			where: { tenantId, code: roleCode },
			select: { id: true },
		});
		if (!role) {
			// Unreachable in practice: the 3 roles are seeded at tenant creation.
			throw new NotFoundException({
				reason: 'ROLE_NOT_FOUND',
				message: `Role ${roleCode} not seeded for this tenant`,
			});
		}
		return role.id;
	}

	/**
	 * SeatUsage: activeCount = ACTIVE users; effectiveMaxUsers =
	 * (plan.maxUsers ?? 0) + tenant.seatBonus, plan from ACTIVE/TRIALING
	 * subscription only. DISABLED/INVITED users do not consume seats.
	 */
	private async seatUsage(
		tenantId: string,
		client: Prisma.TransactionClient | PrismaService = this.prisma,
	): Promise<SeatUsage> {
		const [tenant, activeCount, plan] = await Promise.all([
			client.tenant.findUnique({
				where: { id: tenantId },
				select: { seatBonus: true },
			}),
			client.user.count({ where: { tenantId, status: 'ACTIVE' } }),
			this.activePlan(tenantId, client),
		]);
		const seatBonus = tenant?.seatBonus ?? 0;
		return {
			activeCount,
			effectiveMaxUsers: (plan?.maxUsers ?? 0) + seatBonus,
			planCode: plan?.code ?? null,
			seatBonus,
		};
	}

	/**
	 * Active plan of the tenant's current subscription (status ACTIVE/TRIALING,
	 * not cancelled, within start/end/trial window) — mirrors the entitlement
	 * filter but selects only the seat-relevant plan fields.
	 */
	private async activePlan(
		tenantId: string,
		client: Prisma.TransactionClient | PrismaService,
	): Promise<{ code: string; maxUsers: number } | null> {
		const now = new Date();
		const subscription = await client.subscription.findFirst({
			where: {
				tenantId,
				status: { in: ['ACTIVE', 'TRIALING'] },
				cancelledAt: null,
				startDate: { lte: now },
				AND: [
					{ OR: [{ endDate: null }, { endDate: { gt: now } }] },
					{ OR: [{ trialEndsAt: null }, { trialEndsAt: { gt: now } }] },
				],
			},
			orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
			select: { plan: { select: { code: true, maxUsers: true } } },
		});
		return subscription?.plan ?? null;
	}

	private async assertSeatAvailable(
		tenantId: string,
		tx: Prisma.TransactionClient,
	): Promise<void> {
		const usage = await this.seatUsage(tenantId, tx);
		if (usage.activeCount >= usage.effectiveMaxUsers) {
			throw new ConflictException({
				reason: 'SEAT_LIMIT_REACHED',
				message: `Seat limit reached (${usage.activeCount}/${usage.effectiveMaxUsers})`,
			});
		}
	}

	/**
	 * Block an action that would leave the tenant with zero active OWNERs.
	 * Counted inside the mutating serializable tx (no TOCTOU). `userId` is the
	 * OWNER being removed/demoted — excluded from the surviving count.
	 */
	private async assertNotLastOwner(
		tenantId: string,
		userId: string,
		tx: Prisma.TransactionClient,
	): Promise<void> {
		const remaining = await tx.user.count({
			where: {
				tenantId,
				status: 'ACTIVE',
				id: { not: userId },
				role: { code: 'OWNER' },
			},
		});
		if (remaining === 0) {
			throw new ConflictException({
				reason: 'LAST_OWNER',
				message: 'Cannot remove or demote the last active owner',
			});
		}
	}

	private resolvePassword(
		password: string | undefined,
		generatePassword: boolean | undefined,
	): { plaintext: string; generated: boolean } {
		const hasPassword = typeof password === 'string';
		const wantsGenerate = generatePassword === true;
		if (hasPassword === wantsGenerate) {
			throw new BadRequestException({
				reason: 'PASSWORD_MODE_INVALID',
				message:
					'Provide exactly one of { password } or { generatePassword: true }',
			});
		}
		return wantsGenerate
			? { plaintext: this.passwords.generate(), generated: true }
			: { plaintext: password as string, generated: false };
	}

	private pickAllowedFields(dto: UpdateTenantUserDto): Prisma.UserUpdateInput {
		const data: Prisma.UserUpdateInput = {};
		if (dto.fullName !== undefined) data.fullName = dto.fullName;
		if (dto.username !== undefined) data.username = dto.username;
		if (dto.phone !== undefined) data.phone = dto.phone;
		if (dto.email !== undefined) data.email = dto.email;
		return data;
	}

	private mapUsernameConflict(error: unknown): unknown {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === 'P2002' &&
			this.uniqueViolationFields(error).includes('username')
		) {
			return new ConflictException({
				reason: 'USERNAME_TAKEN',
				message: 'Username already exists in this tenant',
			});
		}
		return error;
	}

	/**
	 * Extract offending column names from a P2002. Standard Prisma exposes
	 * `meta.target`; the `@prisma/adapter-pg` driver nests them under
	 * `meta.driverAdapterError.cause.constraint.fields` (+ `originalMessage`).
	 */
	private uniqueViolationFields(
		error: Prisma.PrismaClientKnownRequestError,
	): string {
		const parts: string[] = [];
		const meta = error.meta as Record<string, unknown> | undefined;
		const target = meta?.target;
		if (Array.isArray(target)) parts.push(target.join(','));
		else if (typeof target === 'string') parts.push(target);
		const cause = (
			meta?.driverAdapterError as
				| { cause?: Record<string, unknown> }
				| undefined
		)?.cause;
		const constraint = cause?.constraint as
			| { fields?: string[]; index?: string }
			| undefined;
		if (Array.isArray(constraint?.fields))
			parts.push(constraint.fields.join(','));
		if (typeof constraint?.index === 'string') parts.push(constraint.index);
		if (typeof cause?.originalMessage === 'string')
			parts.push(cause.originalMessage);
		return parts.join(',');
	}

	private toPublic(row: UserRow): TenantUserPublic {
		return {
			id: row.id,
			tenantId: row.tenantId,
			fullName: row.fullName,
			username: row.username,
			phone: row.phone,
			email: row.email,
			roleCode: row.role.code,
			status: row.status,
			mustChangePassword: row.mustChangePassword,
			lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
		};
	}
}
