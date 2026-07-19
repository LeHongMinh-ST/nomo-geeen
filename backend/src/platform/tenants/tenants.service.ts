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
	type Prisma,
	type TenantMode,
	type TenantStatus,
	type TenantType,
} from '@prisma/client';
import {
	AuditLogger,
	type AuditInput,
} from '../audit/audit-logger.service';
import { PrismaService } from '../prisma/prisma.service';
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
	) {}

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

		const openTickets = await this.prisma.supportTicket.count({
			where: {
				tenantId: id,
				status: {
					in: [...TENANT_DETAIL_AGGREGATES.openTicketStatuses],
				},
			},
		});

		return {
			...this.toListItem(row),
			counts: {
				users: row._count.users,
				subscriptions: row._count.subscriptions,
				openTickets,
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

	async exportCsv(
		query: TenantQueryDto,
		ctx: TenantAuditCtx,
	): Promise<string> {
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
