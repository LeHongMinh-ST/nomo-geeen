import {
	BadRequestException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
} from '@nestjs/common';
import { type AuditLog, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeAuditValue } from './audit-sanitizer';
import { AuditQueryDto } from './dto/audit-query.dto';

export type AuditLogListItem = Omit<
	Pick<
		AuditLog,
		| 'id'
		| 'tenantId'
		| 'actorType'
		| 'actorId'
		| 'actorRoleCode'
		| 'action'
		| 'resource'
		| 'resourceId'
		| 'createdAt'
	>,
	'createdAt'
> & { createdAt: string; before: unknown; after: unknown };

export interface AuditLogListResult {
	items: AuditLogListItem[];
	page: number;
	pageSize: number;
	total: number;
}

export type AuditLogDetail = Omit<AuditLogListItem, 'before' | 'after'> & {
	before: unknown;
	after: unknown;
};

const MAX_PAGE = 10_000;

const LIST_SELECT = {
	id: true,
	tenantId: true,
	actorType: true,
	actorId: true,
	actorRoleCode: true,
	action: true,
	resource: true,
	resourceId: true,
	createdAt: true,
	before: true,
	after: true,
} satisfies Prisma.AuditLogSelect;

const DETAIL_SELECT = LIST_SELECT;

@Injectable()
export class AuditQueryService {
	constructor(private readonly prisma: PrismaService) {}

	async list(query: AuditQueryDto): Promise<AuditLogListResult> {
		const where = this.buildWhere(query);
		const page = Math.min(Math.max(query.page ?? 1, 1), MAX_PAGE);
		const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 100);

		try {
			const [rows, total] = await Promise.all([
				this.prisma.auditLog.findMany({
					where,
					select: LIST_SELECT,
					orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
					skip: (page - 1) * pageSize,
					take: pageSize,
				}),
				this.prisma.auditLog.count({ where }),
			]);

			return {
				items: rows.map((row) => ({
					...row,
					createdAt: row.createdAt.toISOString(),
					before: sanitizeAuditValue(row.before),
					after: sanitizeAuditValue(row.after),
				})),
				page,
				pageSize,
				total,
			};
		} catch {
			throw new InternalServerErrorException('Unable to query audit logs');
		}
	}

	async findById(id: string): Promise<AuditLogDetail> {
		let row: Prisma.AuditLogGetPayload<{ select: typeof DETAIL_SELECT }> | null;
		try {
			row = await this.prisma.auditLog.findUnique({
				where: { id },
				select: DETAIL_SELECT,
			});
		} catch {
			throw new InternalServerErrorException('Unable to query audit log');
		}
		if (!row) throw new NotFoundException('Audit log not found');

		return {
			...row,
			createdAt: row.createdAt.toISOString(),
			before: sanitizeAuditValue(row.before),
			after: sanitizeAuditValue(row.after),
		};
	}

	private buildWhere(query: AuditQueryDto): Prisma.AuditLogWhereInput {
		if (query.from && query.to && new Date(query.from) > new Date(query.to)) {
			throw new BadRequestException('from must be before or equal to to');
		}

		const where: Prisma.AuditLogWhereInput = {
			actorType: query.actorType,
			actorId: query.actorId,
			tenantId: query.tenantId,
			action: query.action,
			resource: query.resource,
			resourceId: query.resourceId,
		};
		if (query.from || query.to) {
			where.createdAt = {
				...(query.from ? { gte: new Date(query.from) } : {}),
				...(query.to ? { lte: new Date(query.to) } : {}),
			};
		}
		if (query.q) {
			where.OR = [
				{ actorId: { contains: query.q, mode: 'insensitive' } },
				{ resource: { contains: query.q, mode: 'insensitive' } },
				{ resourceId: { contains: query.q, mode: 'insensitive' } },
			];
		}
		return where;
	}
}
