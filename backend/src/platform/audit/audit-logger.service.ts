import { BadRequestException, Injectable } from '@nestjs/common';
import { AuditAction, AuditActorType, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * R6.1 / R6.5 input shape for AuditLogger.
 *
 * - `actorId`: PlatformAdmin id; nullable for SYSTEM-initiated events (R6.1).
 * - `actorType`: PLATFORM_ADMIN | SYSTEM (USER reserved for tenant audit, not
 *   used by admin RBAC scope).
 * - `actorRoleCode`: denormalized role code authorizing this action (R6.2);
 *   nullable for SYSTEM actor.
 * - `action`: must be a valid AuditAction enum member (R6.5).
 */
export interface AuditInput {
	tenantId?: string;
	actorId: string | null;
	actorType: AuditActorType;
	actorRoleCode: string | null;
	action: AuditAction;
	resource: string;
	resourceId?: string;
	before?: unknown;
	after?: unknown;
	ipAddress?: string;
	userAgent?: string;
}

// Pre-compute set of valid AuditAction values once. Doing this at module load
// keeps `run()` cheap; the runtime check is O(1) Set lookup.
const VALID_ACTIONS: ReadonlySet<string> = new Set(
	Object.values(AuditAction) as string[],
);

const SENSITIVE_KEY =
	/(password|token|secret|authorization|cookie|credential|hash)/i;
const MAX_SNAPSHOT_ITEMS = 100;
const MAX_SNAPSHOT_DEPTH = 6;
const MAX_SNAPSHOT_STRING_LENGTH = 512;

export function boundedAuditSummary<T, U = T>(
	values: T[],
	map: (value: T) => U = (value) => value as unknown as U,
) {
	const items = values.slice(0, MAX_SNAPSHOT_ITEMS).map(map);
	return values.length > MAX_SNAPSHOT_ITEMS
		? { items, count: values.length, truncated: true }
		: items;
}

function sanitizeSnapshot(value: unknown, depth = 0): unknown {
	if (value === null || typeof value === 'number' || typeof value === 'boolean')
		return value;
	if (typeof value === 'string')
		return value.slice(0, MAX_SNAPSHOT_STRING_LENGTH);
	if (depth >= MAX_SNAPSHOT_DEPTH) return '[TRUNCATED_DEPTH]';
	if (Array.isArray(value)) {
		return boundedAuditSummary(value, (item) =>
			sanitizeSnapshot(item, depth + 1),
		);
	}
	if (typeof value === 'object') {
		const result: Record<string, unknown> = {};
		for (const [key, item] of Object.entries(value))
			if (!SENSITIVE_KEY.test(key))
				result[key] = sanitizeSnapshot(item, depth + 1);
		return result;
	}
	return undefined;
}

function validateInput(input: AuditInput): void {
	if (!VALID_ACTIONS.has(input.action))
		throw new BadRequestException('Unknown audit action');
	if (!input.resource?.trim())
		throw new BadRequestException('Audit resource is required');
	if (input.actorType === AuditActorType.SYSTEM && input.actorId !== null)
		throw new BadRequestException('SYSTEM actor must have actorId=null');
	if (
		input.actorType === AuditActorType.USER &&
		(!input.tenantId || !input.actorId)
	)
		throw new BadRequestException(
			'USER audit actor requires tenantId and actorId',
		);
}

function sanitizeInput(input: AuditInput): AuditInput {
	return {
		...input,
		before: sanitizeSnapshot(input.before),
		after: sanitizeSnapshot(input.after),
	};
}

/**
 * R0-05 AuditLogger (F-10): single API `run(input, stateChange)` that wraps
 * the audit row write AND the caller's state-change callback inside ONE
 * `prisma.$transaction`. Caller MUST NOT call audit-create outside this path
 * (silent-failure mode that bypasses same-tx guarantee).
 *
 * Returns the result of `stateChange(tx)` so consumers can thread values back
 * (e.g. created entity id).
 */
@Injectable()
export class AuditLogger {
	constructor(private readonly prisma: PrismaService) {}

	async run<T>(
		input: AuditInput,
		stateChange: (tx: Prisma.TransactionClient) => Promise<T>,
	): Promise<T> {
		validateInput(input);
		input = sanitizeInput(input);

		return this.prisma.$transaction(async (tx) => {
			const result = await stateChange(tx);
			await tx.auditLog.create({
				data: {
					tenantId: input.tenantId,
					actorType: input.actorType,
					actorId: input.actorId,
					actorRoleCode: input.actorRoleCode,
					action: input.action,
					resource: input.resource,
					resourceId: input.resourceId,
					before: input.before as Prisma.InputJsonValue | undefined,
					after: input.after as Prisma.InputJsonValue | undefined,
					ipAddress: input.ipAddress,
					userAgent: input.userAgent,
				},
			});
			return result;
		});
	}

	/**
	 * Ghi MỘT audit row bằng transaction client do caller cung cấp. Dùng khi
	 * nhiều audit rows (vd `TENANT_CREATE` + `USER_CREATE`) phải commit/rollback
	 * cùng một `$transaction` với các mutation nghiệp vụ. KHÔNG tự mở transaction
	 * mới (khác `run()`), nên caller giữ nguyên tính nguyên tử của tx ngoài.
	 */
	async writeInTx(
		tx: Prisma.TransactionClient,
		input: AuditInput,
	): Promise<void> {
		validateInput(input);
		input = sanitizeInput(input);
		await tx.auditLog.create({
			data: {
				tenantId: input.tenantId,
				actorType: input.actorType,
				actorId: input.actorId,
				actorRoleCode: input.actorRoleCode,
				action: input.action,
				resource: input.resource,
				resourceId: input.resourceId,
				before: input.before as Prisma.InputJsonValue | undefined,
				after: input.after as Prisma.InputJsonValue | undefined,
				ipAddress: input.ipAddress,
				userAgent: input.userAgent,
			},
		});
	}

	/**
	 * Event-only audit row (no paired state mutation). Prefer `run()` when the
	 * audit must share a transaction with a DB write.
	 */
	async log(input: AuditInput): Promise<void> {
		validateInput(input);
		input = sanitizeInput(input);
		await this.prisma.auditLog.create({
			data: {
				tenantId: input.tenantId,
				actorType: input.actorType,
				actorId: input.actorId,
				actorRoleCode: input.actorRoleCode,
				action: input.action,
				resource: input.resource,
				resourceId: input.resourceId,
				before: input.before as Prisma.InputJsonValue | undefined,
				after: input.after as Prisma.InputJsonValue | undefined,
				ipAddress: input.ipAddress,
				userAgent: input.userAgent,
			},
		});
	}
}
