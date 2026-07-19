import {
	BadRequestException,
	ConflictException,
	HttpException,
	HttpStatus,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import {
	AuditAction,
	AuditActorType,
	Prisma,
	type TenantMode,
	type TenantStatus,
	type TenantType,
} from '@prisma/client';
import { PasswordService } from '../auth/password.service';
import { type AuditInput, AuditLogger } from '../audit/audit-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateTenantDto } from './dto/create-tenant.dto';
import type { TenantQueryDto } from './dto/tenant-query.dto';
import type { TenantStatusTransitionDto } from './dto/tenant-status-transition.dto';
import type { UpdateTenantDto } from './dto/update-tenant.dto';
import {
	canTransition,
	TENANT_DETAIL_AGGREGATES,
} from './tenant-status.transitions';

export interface TenantListItem {
	id: string;
	slug: string;
	name: string;
	tenantType: TenantType;
	mode: TenantMode;
	status: TenantStatus;
	logoUrl: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface TenantDetail extends TenantListItem {
	counts: {
		users: number;
		subscriptions: number;
		openTickets: number;
	};
	quotaUsage: {
		users: number;
		warehouses: number;
		products: number;
		customers: number;
		ordersThisMonth: number;
		storageBytes: string;
	};
}

export interface ListTenantsResult {
	items: TenantListItem[];
	page: number;
	pageSize: number;
	total: number;
}

export interface TenantAuditCtx {
	actorId: string;
	actorRoleCode: string | null;
	ipAddress?: string;
	userAgent?: string;
}

/** Public owner shape for the creation response — never exposes passwordHash. */
export interface CreatedOwnerPublic {
	id: string;
	tenantId: string;
	fullName: string;
	username: string;
	phone: string | null;
	email: string | null;
	roleCode: 'OWNER';
	status: 'ACTIVE';
	mustChangePassword: boolean;
	createdAt: string;
}

export interface CreateTenantResult {
	tenant: TenantListItem & { seatBonus: number };
	owner: CreatedOwnerPublic;
	generatedPassword: string | null;
}

/**
 * Per-tenant roles seeded at creation. Grants are cloned from the matching
 * system role template (tenantId=null) so a new store owns its own role rows.
 */
const PER_TENANT_ROLES = [
	{ code: 'OWNER', name: 'Chủ cửa hàng', rank: 1 },
	{ code: 'MANAGER', name: 'Quản lý', rank: 2 },
	{ code: 'STAFF', name: 'Nhân viên', rank: 3 },
] as const;

const DEFAULT_SEAT_BONUS = 10;

const LIST_SELECT = {
	id: true,
	slug: true,
	name: true,
	tenantType: true,
	mode: true,
	status: true,
	logoUrl: true,
	createdAt: true,
	updatedAt: true,
} as const;

const EXPORT_COLUMNS = [
	'id',
	'slug',
	'name',
	'tenantType',
	'mode',
	'status',
	'createdAt',
	'updatedAt',
] as const;

const EXPORT_MAX = 10_000;

@Injectable()
export class TenantsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditLogger,
		private readonly passwords: PasswordService,
	) {}

	/**
	 * Atomically create a Tenant + its first OWNER user + three per-tenant roles
	 * (OWNER/MANAGER/STAFF, grants cloned from system templates) + audit rows,
	 * all inside one `$transaction`. Any failure rolls back completely — a store
	 * never exists without an owner. Uniqueness is enforced by DB constraints
	 * (`tenant.slug`, `@@unique([tenantId, username])`) mapped to 409, no
	 * read-then-write. Returns the generated password once iff it was generated.
	 */
	async create(
		dto: CreateTenantDto,
		ctx: TenantAuditCtx,
	): Promise<CreateTenantResult> {
		const { plaintext, generated } = this.resolvePassword(dto.owner);
		const passwordHash = await this.passwords.hash(plaintext);

		const seatBonus = dto.tenant.seatBonus ?? DEFAULT_SEAT_BONUS;
		const mustChangePassword = dto.owner.mustChangePassword ?? false;

		// Preload system role templates + their grants (outside the tx; static
		// seed data). Missing templates is a seed/config error, not user input.
		const templates = await this.prisma.role.findMany({
			where: {
				tenantId: null,
				code: { in: PER_TENANT_ROLES.map((r) => r.code) },
			},
			select: {
				code: true,
				permissions: { select: { permissionId: true } },
			},
		});
		const grantsByCode = new Map(
			templates.map((t) => [t.code, t.permissions.map((p) => p.permissionId)]),
		);

		try {
			return await this.prisma.$transaction(async (tx) => {
				return await this.provision(tx, {
					dto,
					ctx,
					passwordHash,
					seatBonus,
					mustChangePassword,
					generatedPassword: generated ? plaintext : null,
					grantsByCode,
				});
			});
		} catch (error) {
			throw this.mapCreateError(error);
		}
	}

	private resolvePassword(owner: CreateTenantDto['owner']): {
		plaintext: string;
		generated: boolean;
	} {
		const hasPassword = typeof owner.password === 'string';
		const wantsGenerate = owner.generatePassword === true;
		if (hasPassword === wantsGenerate) {
			// neither or both
			throw new BadRequestException({
				reason: 'PASSWORD_MODE_INVALID',
				message:
					'Provide exactly one of { password } or { generatePassword: true }',
			});
		}
		return wantsGenerate
			? { plaintext: this.passwords.generate(), generated: true }
			: { plaintext: owner.password as string, generated: false };
	}

	private mapCreateError(error: unknown): unknown {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === 'P2002'
		) {
			const fields = this.uniqueViolationFields(error);
			if (fields.includes('username')) {
				return new ConflictException({
					reason: 'USERNAME_TAKEN',
					message: 'Owner username already exists in this tenant',
				});
			}
			if (fields.includes('slug')) {
				return new ConflictException({
					reason: 'SLUG_TAKEN',
					message: 'Tenant slug already exists',
				});
			}
			// Any other unique violation (role/permission seeding) is not a
			// user-facing slug/username conflict — surface it unmapped.
			return error;
		}
		return error;
	}

	/**
	 * Extract the offending column names from a P2002. Standard Prisma exposes
	 * `meta.target`; the `@prisma/adapter-pg` driver (Prisma 7) instead nests the
	 * info under `meta.driverAdapterError.cause.constraint.fields` and includes
	 * the raw constraint name in `originalMessage` (e.g. `tenant_slug_key`).
	 * Read all three so classification is adapter-agnostic.
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
			meta?.driverAdapterError as { cause?: Record<string, unknown> } | undefined
		)?.cause;
		const constraint = cause?.constraint as
			| { fields?: string[]; index?: string }
			| undefined;
		if (Array.isArray(constraint?.fields)) parts.push(constraint.fields.join(','));
		if (typeof constraint?.index === 'string') parts.push(constraint.index);
		if (typeof cause?.originalMessage === 'string') {
			parts.push(cause.originalMessage);
		}
		return parts.join(',');
	}

	private async provision(
		tx: Prisma.TransactionClient,
		args: {
			dto: CreateTenantDto;
			ctx: TenantAuditCtx;
			passwordHash: string;
			seatBonus: number;
			mustChangePassword: boolean;
			generatedPassword: string | null;
			grantsByCode: Map<string, string[]>;
		},
	): Promise<CreateTenantResult> {
		const {
			dto,
			ctx,
			passwordHash,
			seatBonus,
			mustChangePassword,
			generatedPassword,
			grantsByCode,
		} = args;

		// 1. Create the tenant, then its three per-tenant roles (roles need the
		//    tenantId), then the OWNER user linked to the seeded OWNER role.
		const tenant = await tx.tenant.create({
			data: {
				slug: dto.tenant.slug,
				name: dto.tenant.name,
				tenantType: dto.tenant.tenantType,
				mode: 'SIMPLE', // Phase 1: derived server-side, not client-supplied
				status: 'ACTIVE',
				logoUrl: dto.tenant.logoUrl ?? null,
				seatBonus,
			},
			select: LIST_SELECT,
		});

		const roleIdByCode = new Map<string, string>();
		for (const spec of PER_TENANT_ROLES) {
			const role = await tx.role.create({
				data: {
					tenantId: tenant.id,
					code: spec.code,
					name: spec.name,
					isSystem: false,
					isAdmin: false,
					rank: spec.rank,
				},
				select: { id: true },
			});
			roleIdByCode.set(spec.code, role.id);
			const grants = grantsByCode.get(spec.code) ?? [];
			if (grants.length > 0) {
				await tx.rolePermission.createMany({
					data: grants.map((permissionId) => ({
						roleId: role.id,
						permissionId,
					})),
					skipDuplicates: true,
				});
			}
		}

		const ownerRoleId = roleIdByCode.get('OWNER');
		if (!ownerRoleId) {
			// Unreachable: PER_TENANT_ROLES always contains OWNER.
			throw new Error('OWNER role not seeded');
		}

		const owner = await tx.user.create({
			data: {
				tenantId: tenant.id,
				username: dto.owner.username,
				email: dto.owner.email ?? null,
				phone: dto.owner.phone ?? null,
				passwordHash,
				mustChangePassword,
				fullName: dto.owner.fullName,
				roleId: ownerRoleId,
				status: 'ACTIVE',
				createdByType: 'PLATFORM_ADMIN',
				createdById: ctx.actorId,
			},
			select: {
				id: true,
				tenantId: true,
				fullName: true,
				username: true,
				phone: true,
				email: true,
				mustChangePassword: true,
				createdAt: true,
			},
		});

		// 2. Audit rows share this same tx (writeInTx, never self-transacting run()).
		const baseAudit: Omit<AuditInput, 'action' | 'resource' | 'resourceId'> = {
			actorId: ctx.actorId,
			actorType: AuditActorType.PLATFORM_ADMIN,
			actorRoleCode: ctx.actorRoleCode,
			ipAddress: ctx.ipAddress,
			userAgent: ctx.userAgent?.slice(0, 512),
		};
		await this.audit.writeInTx(tx, {
			...baseAudit,
			action: AuditAction.TENANT_CREATE,
			resource: 'tenant',
			resourceId: tenant.id,
			after: { slug: tenant.slug, name: tenant.name, seatBonus },
		});
		await this.audit.writeInTx(tx, {
			...baseAudit,
			action: AuditAction.USER_CREATE,
			resource: 'user',
			resourceId: owner.id,
			after: {
				tenantId: tenant.id,
				username: owner.username,
				roleCode: 'OWNER',
			},
		});

		return {
			tenant: { ...this.toListItem(tenant), seatBonus },
			owner: {
				id: owner.id,
				tenantId: owner.tenantId,
				fullName: owner.fullName,
				username: owner.username,
				phone: owner.phone,
				email: owner.email,
				roleCode: 'OWNER',
				status: 'ACTIVE',
				mustChangePassword: owner.mustChangePassword,
				createdAt: owner.createdAt.toISOString(),
			},
			generatedPassword,
		};
	}


	async list(query: TenantQueryDto): Promise<ListTenantsResult> {
		const page = query.page ?? 1;
		const pageSize = query.pageSize ?? 20;
		const skip = (page - 1) * pageSize;
		const where = this.buildListWhere(query);

		const [rows, total] = await Promise.all([
			this.prisma.tenant.findMany({
				where,
				select: LIST_SELECT,
				orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
				skip,
				take: pageSize,
			}),
			this.prisma.tenant.count({ where }),
		]);

		return {
			items: rows.map((r) => this.toListItem(r)),
			page,
			pageSize,
			total,
		};
	}

	async findById(id: string): Promise<TenantDetail> {
		const row = await this.prisma.tenant.findFirst({
			where: { id, deletedAt: null },
			select: {
				...LIST_SELECT,
				_count: {
					select: {
						users: true,
						subscriptions: true,
					},
				},
			},
		});
		if (!row) {
			throw new NotFoundException('Tenant not found');
		}

		const monthStart = new Date();
		monthStart.setUTCDate(1);
		monthStart.setUTCHours(0, 0, 0, 0);
		const nextMonth = new Date(monthStart);
		nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
		const [
			openTickets,
			warehouses,
			products,
			customers,
			ordersThisMonth,
			storage,
		] = await Promise.all([
			this.prisma.supportTicket.count({
				where: {
					tenantId: id,
					status: {
						in: [...TENANT_DETAIL_AGGREGATES.openTicketStatuses],
					},
				},
			}),
			this.prisma.warehouse.count({ where: { tenantId: id, deletedAt: null } }),
			this.prisma.product.count({ where: { tenantId: id, deletedAt: null } }),
			this.prisma.customer.count({ where: { tenantId: id, deletedAt: null } }),
			this.prisma.sale.count({
				where: {
					tenantId: id,
					deletedAt: null,
					soldAt: { gte: monthStart, lt: nextMonth },
				},
			}),
			this.prisma.storedFile.aggregate({
				where: { tenantId: id, deletedAt: null },
				_sum: { sizeBytes: true },
			}),
		]);

		return {
			...this.toListItem(row),
			counts: {
				users: row._count.users,
				subscriptions: row._count.subscriptions,
				openTickets,
			},
			quotaUsage: {
				users: row._count.users,
				warehouses,
				products,
				customers,
				ordersThisMonth,
				storageBytes: (storage._sum.sizeBytes ?? BigInt(0)).toString(),
			},
		};
	}

	async update(
		id: string,
		dto: UpdateTenantDto,
		ctx: TenantAuditCtx,
	): Promise<TenantDetail> {
		if (dto.logoUrl === '__PRIVATE_HOST__') {
			throw new BadRequestException({
				reason: 'INVALID_LOGO_URL',
				message: 'logoUrl must be a public HTTPS URL',
			});
		}

		const expected = new Date(dto.expectedUpdatedAt);
		if (Number.isNaN(expected.getTime())) {
			throw new BadRequestException({
				reason: 'INVALID_EXPECTED_UPDATED_AT',
				message: 'expectedUpdatedAt must be a valid ISO date',
			});
		}

		const data: Prisma.TenantUpdateManyMutationInput = {};
		if (dto.name !== undefined) data.name = dto.name;
		if (dto.tenantType !== undefined) data.tenantType = dto.tenantType;
		if (dto.mode !== undefined) data.mode = dto.mode;
		if (dto.logoUrl !== undefined) data.logoUrl = dto.logoUrl;

		if (Object.keys(data).length === 0) {
			throw new BadRequestException({
				reason: 'EMPTY_UPDATE',
				message: 'No editable fields provided',
			});
		}

		const current = await this.prisma.tenant.findFirst({
			where: { id, deletedAt: null },
			select: LIST_SELECT,
		});
		if (!current) {
			throw new NotFoundException('Tenant not found');
		}
		if (current.updatedAt.getTime() !== expected.getTime()) {
			throw new ConflictException({
				reason: 'STALE_UPDATE',
				message: 'Tenant was modified by another request',
			});
		}

		const before = this.toListItem(current);
		const auditInput: AuditInput = {
			actorId: ctx.actorId,
			actorType: AuditActorType.PLATFORM_ADMIN,
			actorRoleCode: ctx.actorRoleCode,
			action: AuditAction.TENANT_UPDATE,
			resource: 'tenant',
			resourceId: id,
			before,
			ipAddress: ctx.ipAddress,
			userAgent: ctx.userAgent?.slice(0, 512),
		};

		await this.audit.run(auditInput, async (tx) => {
			const result = await tx.tenant.updateMany({
				where: {
					id,
					deletedAt: null,
					updatedAt: expected,
				},
				data,
			});
			if (result.count === 0) {
				const still = await tx.tenant.findFirst({
					where: { id, deletedAt: null },
					select: { id: true },
				});
				if (!still) {
					throw new NotFoundException('Tenant not found');
				}
				throw new ConflictException({
					reason: 'STALE_UPDATE',
					message: 'Tenant was modified by another request',
				});
			}
			const after = await tx.tenant.findFirstOrThrow({
				where: { id, deletedAt: null },
				select: LIST_SELECT,
			});
			auditInput.after = this.toListItem(after);
			return after;
		});

		return this.findById(id);
	}

	async transitionStatus(
		id: string,
		dto: TenantStatusTransitionDto,
		ctx: TenantAuditCtx,
	): Promise<TenantDetail> {
		const current = await this.prisma.tenant.findFirst({
			where: { id, deletedAt: null },
			select: LIST_SELECT,
		});
		if (!current) {
			throw new NotFoundException('Tenant not found');
		}

		if (!canTransition(current.status, dto.status)) {
			throw new ConflictException({
				reason: 'INVALID_STATUS_TRANSITION',
				message: `Cannot transition from ${current.status} to ${dto.status}`,
			});
		}

		const previousStatus = current.status;
		const nextStatus = dto.status;

		await this.audit.run(
			{
				actorId: ctx.actorId,
				actorType: AuditActorType.PLATFORM_ADMIN,
				actorRoleCode: ctx.actorRoleCode,
				action: AuditAction.TENANT_STATUS_CHANGE,
				resource: 'tenant',
				resourceId: id,
				before: { status: previousStatus },
				after: {
					status: nextStatus,
					reason: dto.reason ?? null,
				},
				ipAddress: ctx.ipAddress,
				userAgent: ctx.userAgent?.slice(0, 512),
			},
			async (tx) => {
				const result = await tx.tenant.updateMany({
					where: {
						id,
						deletedAt: null,
						status: previousStatus,
					},
					data: { status: nextStatus },
				});
				if (result.count === 0) {
					const still = await tx.tenant.findFirst({
						where: { id, deletedAt: null },
						select: { id: true, status: true },
					});
					if (!still) {
						throw new NotFoundException('Tenant not found');
					}
					throw new ConflictException({
						reason: 'STATUS_CONFLICT',
						message: 'Concurrent status change rejected',
					});
				}
				return result;
			},
		);

		return this.findById(id);
	}

	async exportCsv(query: TenantQueryDto, ctx: TenantAuditCtx): Promise<string> {
		const where = this.buildListWhere(query);
		const rows = await this.prisma.tenant.findMany({
			where,
			select: {
				id: true,
				slug: true,
				name: true,
				tenantType: true,
				mode: true,
				status: true,
				createdAt: true,
				updatedAt: true,
			},
			orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
			take: EXPORT_MAX + 1,
		});

		if (rows.length > EXPORT_MAX) {
			throw new HttpException(
				{
					reason: 'EXPORT_TOO_LARGE',
					message: `Export exceeds ${EXPORT_MAX} rows`,
				},
				HttpStatus.PAYLOAD_TOO_LARGE,
			);
		}

		const csv = this.toFormulaSafeCsv(rows);

		await this.audit.log({
			actorId: ctx.actorId,
			actorType: AuditActorType.PLATFORM_ADMIN,
			actorRoleCode: ctx.actorRoleCode,
			action: AuditAction.TENANT_EXPORT,
			resource: 'tenant',
			after: {
				filter: {
					q: query.q ?? null,
					status: query.status ?? null,
				},
				rowCount: rows.length,
			},
			ipAddress: ctx.ipAddress,
			userAgent: ctx.userAgent?.slice(0, 512),
		});

		return csv;
	}

	private toFormulaSafeCsv(
		rows: Array<{
			id: string;
			slug: string;
			name: string;
			tenantType: string;
			mode: string;
			status: string;
			createdAt: Date;
			updatedAt: Date;
		}>,
	): string {
		const header = EXPORT_COLUMNS.join(',');
		const lines = rows.map((r) =>
			[
				r.id,
				r.slug,
				r.name,
				r.tenantType,
				r.mode,
				r.status,
				r.createdAt.toISOString(),
				r.updatedAt.toISOString(),
			]
				.map((v) => this.csvCell(String(v)))
				.join(','),
		);
		return `${[header, ...lines].join('\n')}\n`;
	}

	/** RFC 4180 quote + formula neutralization for =+-@ */
	private csvCell(value: string): string {
		let v = value;
		if (/^[=+\-@]/.test(v)) {
			v = `'${v}`;
		}
		if (/[",\n\r]/.test(v)) {
			return `"${v.replace(/"/g, '""')}"`;
		}
		return v;
	}

	private buildListWhere(query: TenantQueryDto): Prisma.TenantWhereInput {
		const where: Prisma.TenantWhereInput = { deletedAt: null };
		if (query.status) {
			where.status = query.status;
		}
		if (query.q) {
			where.OR = [
				{ name: { contains: query.q, mode: 'insensitive' } },
				{ slug: { contains: query.q, mode: 'insensitive' } },
			];
		}
		return where;
	}

	private toListItem(row: {
		id: string;
		slug: string;
		name: string;
		tenantType: TenantType;
		mode: TenantMode;
		status: TenantStatus;
		logoUrl: string | null;
		createdAt: Date;
		updatedAt: Date;
	}): TenantListItem {
		return {
			id: row.id,
			slug: row.slug,
			name: row.name,
			tenantType: row.tenantType,
			mode: row.mode,
			status: row.status,
			logoUrl: row.logoUrl,
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
		};
	}
}
