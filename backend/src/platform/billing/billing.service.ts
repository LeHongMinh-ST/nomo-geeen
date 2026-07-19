import {
	BadRequestException,
	ConflictException,
	Inject,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import {
	AuditAction,
	AuditActorType,
	BillingCycle,
	Prisma,
	SubscriptionStatus,
} from '@prisma/client';
import { type AuditInput, AuditLogger } from '../audit/audit-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CancelSubscriptionDto } from './dto/cancel-subscription.dto';
import { type CreatePlanDto, PlanQueryDto } from './dto/create-plan.dto';
import type { CreateSubscriptionDto } from './dto/create-subscription.dto';
import type { RenewSubscriptionDto } from './dto/renew-subscription.dto';
import { SubscriptionQueryDto } from './dto/subscription-query.dto';
import { trimManualValue } from './dto/subscription-validation';
import type { PlanActivationDto, UpdatePlanDto } from './dto/update-plan.dto';

const PLAN_INCLUDE = {
	features: { include: { feature: { select: { code: true } } } },
} as const;

type PlanWithFeatures = Prisma.PlanGetPayload<{
	include: typeof PLAN_INCLUDE;
}>;

export interface PlanAuditContext {
	actorId: string;
	actorRoleCode: string | null;
	ipAddress?: string;
	userAgent?: string;
}

export interface PlanResponse {
	id: string;
	code: string;
	name: string;
	description: string | null;
	price: string;
	billingCycle: BillingCycle;
	isActive: boolean;
	quotas: {
		maxUsers: number;
		maxWarehouses: number;
		maxProducts: number | null;
		maxCustomers: number | null;
		maxOrdersPerMonth: number | null;
		maxStorageBytes: string;
	};
	featureCodes: string[];
	createdAt: string;
	updatedAt: string;
}

export interface ListPlansResult {
	items: PlanResponse[];
	page: number;
	pageSize: number;
	total: number;
}

export type BillingClock = () => Date;
export const BILLING_CLOCK = Symbol('BILLING_CLOCK');
type SubscriptionWithPlan = Prisma.SubscriptionGetPayload<{
	include: { plan: true };
}>;

export interface SubscriptionResponse {
	id: string;
	tenantId: string;
	planId: string;
	plan: { id: string; code: string; name: string; isActive: boolean };
	status: SubscriptionStatus;
	billingCycle: BillingCycle;
	startDate: string;
	endDate: string | null;
	trialEndsAt: string | null;
	cancelledAt: string | null;
	manualReference: string | null;
	reason: string | null;
	createdAt: string;
	updatedAt: string;
}

export interface SubscriptionResult {
	current: SubscriptionResponse | null;
	history: SubscriptionResponse[];
	page: number;
	pageSize: number;
	total: number;
}

@Injectable()
export class BillingService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditLogger,
		@Inject(BILLING_CLOCK)
		private readonly clock: BillingClock = () => new Date(),
	) {}

	async getSubscription(
		tenantId: string,
		query: SubscriptionQueryDto = new SubscriptionQueryDto(),
	): Promise<SubscriptionResult> {
		await this.requireTenant(tenantId);
		const page = Math.max(1, query.page ?? 1);
		const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
		const where = { tenantId };
		const [currentRow, rows, total] = await Promise.all([
			this.currentSubscription(tenantId),
			this.prisma.subscription.findMany({
				where,
				orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
				skip: (page - 1) * pageSize,
				take: pageSize,
				include: { plan: true },
			}),
			this.prisma.subscription.count({ where }),
		]);
		const current =
			currentRow &&
			(this.isEffective(currentRow) ||
				(this.expiry(currentRow)?.getTime() ?? Number.POSITIVE_INFINITY) <=
					this.clock().getTime())
				? currentRow
				: null;
		return {
			current: current ? this.subscriptionResponse(current) : null,
			history: rows.map((row) => this.subscriptionResponse(row)),
			page,
			pageSize,
			total,
		};
	}

	async assignSubscription(
		tenantId: string,
		dto: CreateSubscriptionDto,
		ctx: PlanAuditContext,
	): Promise<SubscriptionResponse> {
		const tenant = await this.requireTenant(tenantId);
		const plan = await this.requireActivePlan(dto.planId);
		const dates = this.subscriptionDates(dto);
		const reference = trimManualValue(dto.manualReference);
		const reason = trimManualValue(dto.reason);
		const previous = await this.currentSubscription(tenantId);
		if (previous) {
			if (!dto.expectedUpdatedAt)
				throw new BadRequestException({
					reason: 'EXPECTED_UPDATED_AT_REQUIRED',
					message: 'expectedUpdatedAt is required when changing a subscription',
				});
			const expected = this.parseExpected(dto.expectedUpdatedAt);
			if (previous.updatedAt.getTime() !== expected.getTime())
				throw this.staleSubscription();
		}
		const id = crypto.randomUUID();
		const action = previous
			? AuditAction.SUBSCRIPTION_CHANGE
			: AuditAction.SUBSCRIPTION_ASSIGN;
		const input = this.subscriptionAudit(
			ctx,
			action,
			id,
			previous ? this.subscriptionResponse(previous) : undefined,
		);
		return this.audit.run(input, async (tx) => {
			if (previous) {
				await this.closeSubscription(tx, tenantId, previous, input);
			}
			const created = await tx.subscription.create({
				data: {
					id,
					tenantId: tenant.id,
					planId: plan.id,
					status: dto.status,
					billingCycle: dto.billingCycle,
					...dates,
					manualReference: reference,
					reason,
				},
				include: { plan: true },
			});
			const response = this.subscriptionResponse(created);
			input.after = response;
			return response;
		});
	}

	async renewSubscription(
		tenantId: string,
		dto: RenewSubscriptionDto,
		ctx: PlanAuditContext,
	): Promise<SubscriptionResponse> {
		await this.requireTenant(tenantId);
		const current = await this.currentSubscription(tenantId);
		if (!current) throw new NotFoundException('Subscription not found');
		const expected = this.parseExpected(dto.expectedUpdatedAt);
		if (current.updatedAt.getTime() !== expected.getTime())
			throw this.staleSubscription();
		const now = this.clock();
		const cycle = dto.billingCycle ?? current.billingCycle;
		const base =
			current.endDate && current.endDate > now ? current.endDate : now;
		const input = this.subscriptionAudit(
			ctx,
			AuditAction.SUBSCRIPTION_RENEW,
			current.id,
			this.subscriptionResponse(current),
		);
		return this.audit.run(input, async (tx) => {
			const changed = await tx.subscription.updateMany({
				where: {
					id: current.id,
					tenantId,
					updatedAt: expected,
					status: { not: 'CANCELLED' },
				},
				data: {
					status: 'ACTIVE',
					billingCycle: cycle,
					endDate: this.addCycle(base, cycle),
					manualReference: trimManualValue(dto.manualReference),
					reason: trimManualValue(dto.reason),
					cancelledAt: null,
				},
			});
			if (changed.count === 0)
				throw await this.ensureSubscriptionConflict(tx, tenantId, current.id);
			const row = await tx.subscription.findUniqueOrThrow({
				where: { id: current.id },
				include: { plan: true },
			});
			input.after = this.subscriptionResponse(row);
			return this.subscriptionResponse(row);
		});
	}

	async cancelSubscription(
		tenantId: string,
		dto: CancelSubscriptionDto,
		ctx: PlanAuditContext,
	): Promise<SubscriptionResponse> {
		await this.requireTenant(tenantId);
		const current = await this.currentSubscription(tenantId);
		if (!current) throw new NotFoundException('Subscription not found');
		const now = this.clock();
		const currentExpiry = this.expiry(current);
		if (currentExpiry && currentExpiry <= now)
			throw new BadRequestException({
				reason: 'SUBSCRIPTION_EXPIRED',
				message: 'Expired subscriptions cannot be cancelled',
			});
		const reason = trimManualValue(dto.reason);
		if (!reason)
			throw new BadRequestException({
				reason: 'CANCELLATION_REASON_REQUIRED',
				message: 'reason is required when cancelling a subscription',
			});
		const expected = this.parseExpected(dto.expectedUpdatedAt);
		if (current.updatedAt.getTime() !== expected.getTime())
			throw this.staleSubscription();
		const input = this.subscriptionAudit(
			ctx,
			AuditAction.SUBSCRIPTION_CANCEL,
			current.id,
			this.subscriptionResponse(current),
		);
		return this.audit.run(input, async (tx) => {
			const changed = await tx.subscription.updateMany({
				where: {
					id: current.id,
					tenantId,
					updatedAt: expected,
					status: { not: 'CANCELLED' },
				},
				data: {
					status: 'CANCELLED',
					cancelledAt: now,
					reason,
				},
			});
			if (changed.count === 0)
				throw await this.ensureSubscriptionConflict(tx, tenantId, current.id);
			const row = await tx.subscription.findUniqueOrThrow({
				where: { id: current.id },
				include: { plan: true },
			});
			input.after = this.subscriptionResponse(row);
			return this.subscriptionResponse(row);
		});
	}

	async list(
		query: PlanQueryDto = new PlanQueryDto(),
	): Promise<ListPlansResult> {
		const page = Math.max(1, query.page ?? 1);
		const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 20));
		const [rows, total] = await Promise.all([
			this.prisma.plan.findMany({
				include: PLAN_INCLUDE,
				orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
				skip: (page - 1) * pageSize,
				take: pageSize,
			}),
			this.prisma.plan.count(),
		]);
		return {
			items: rows.map((row) => this.toResponse(row)),
			page,
			pageSize,
			total,
		};
	}

	async findById(id: string): Promise<PlanResponse> {
		const row = await this.prisma.plan.findUnique({
			where: { id },
			include: PLAN_INCLUDE,
		});
		if (!row) throw new NotFoundException('Plan not found');
		return this.toResponse(row);
	}

	async create(
		dto: CreatePlanDto,
		ctx: PlanAuditContext,
	): Promise<PlanResponse> {
		const featureIds = await this.resolveFeatureIds(dto.featureCodes ?? []);
		const id = crypto.randomUUID();
		const data = this.planCreateData(dto, featureIds);
		const input: AuditInput = {
			actorId: ctx.actorId,
			actorType: AuditActorType.PLATFORM_ADMIN,
			actorRoleCode: ctx.actorRoleCode,
			action: AuditAction.PLAN_CREATE,
			resource: 'plan',
			resourceId: id,
			ipAddress: ctx.ipAddress,
			userAgent: ctx.userAgent?.slice(0, 512),
		};

		try {
			return await this.audit.run(input, async (tx) => {
				const row = await tx.plan.create({
					data: {
						id,
						...data,
						features: {
							create: featureIds.map((featureId) => ({ featureId })),
						},
					},
					include: PLAN_INCLUDE,
				});
				const response = this.toResponse(row);
				input.after = response;
				return response;
			});
		} catch (error) {
			this.rethrowPrismaConflict(error, 'PLAN_CODE_DUPLICATE');
			throw error;
		}
	}

	async update(
		id: string,
		dto: UpdatePlanDto,
		ctx: PlanAuditContext,
	): Promise<PlanResponse> {
		const expected = this.parseExpected(dto.expectedUpdatedAt);
		const current = await this.prisma.plan.findUnique({
			where: { id },
			include: PLAN_INCLUDE,
		});
		if (!current) throw new NotFoundException('Plan not found');
		if (current.updatedAt.getTime() !== expected.getTime()) throw this.stale();
		const featureIds =
			dto.featureCodes === undefined
				? undefined
				: await this.resolveFeatureIds(dto.featureCodes);
		const data = this.planUpdateData(dto);
		if (Object.keys(data).length === 0 && featureIds === undefined) {
			throw new BadRequestException({
				reason: 'EMPTY_UPDATE',
				message: 'No editable fields provided',
			});
		}
		const before = this.toResponse(current);
		const auditInput = this.auditInput(ctx, AuditAction.PLAN_UPDATE, id, {
			before,
		});

		try {
			return await this.audit
				.run(auditInput, async (tx) => {
					const changed = await tx.plan.updateMany({
						where: { id, updatedAt: expected },
						data,
					});
					if (changed.count === 0) throw await this.ensurePlanConflict(tx, id);
					if (featureIds !== undefined) {
						await tx.planFeature.deleteMany({ where: { planId: id } });
						await tx.planFeature.createMany({
							data: featureIds.map((featureId) => ({
								planId: id,
								featureId,
							})),
						});
					}
					const after = await tx.plan.findUniqueOrThrow({
						where: { id },
						include: PLAN_INCLUDE,
					});
					const response = this.toResponse(after);
					auditInput.after = response;
					return response;
				})
				.then((result) => result);
		} catch (error) {
			this.rethrowPrismaConflict(error, 'PLAN_CODE_DUPLICATE');
			throw error;
		}
	}

	async setActivation(
		id: string,
		dto: PlanActivationDto,
		ctx: PlanAuditContext,
	): Promise<PlanResponse> {
		const expected = this.parseExpected(dto.expectedUpdatedAt);
		const current = await this.prisma.plan.findUnique({
			where: { id },
			include: PLAN_INCLUDE,
		});
		if (!current) throw new NotFoundException('Plan not found');
		if (current.updatedAt.getTime() !== expected.getTime()) throw this.stale();
		const action = dto.isActive
			? AuditAction.PLAN_ACTIVATE
			: AuditAction.PLAN_DEACTIVATE;
		const auditInput = this.auditInput(ctx, action, id, {
			before: this.toResponse(current),
		});
		return this.audit.run(auditInput, async (tx) => {
			const changed = await tx.plan.updateMany({
				where: { id, updatedAt: expected },
				data: { isActive: dto.isActive },
			});
			if (changed.count === 0) throw await this.ensurePlanConflict(tx, id);
			const after = await tx.plan.findUniqueOrThrow({
				where: { id },
				include: PLAN_INCLUDE,
			});
			const response = this.toResponse(after);
			auditInput.after = response;
			return response;
		});
	}

	private async resolveFeatureIds(codes: string[]): Promise<string[]> {
		const features = await this.prisma.feature.findMany({
			where: { code: { in: codes } },
			select: { id: true, code: true },
		});
		if (features.length !== codes.length) {
			const found = new Set(features.map((feature) => feature.code));
			throw new BadRequestException({
				reason: 'UNKNOWN_FEATURE_CODE',
				codes: codes.filter((code) => !found.has(code)),
			});
		}
		return codes.map(
			(code) => features.find((feature) => feature.code === code)?.id as string,
		);
	}

	private async requireTenant(id: string) {
		const tenant = await this.prisma.tenant.findFirst({
			where: { id, deletedAt: null },
			select: { id: true },
		});
		if (!tenant) throw new NotFoundException('Tenant not found');
		return tenant;
	}

	private async requireActivePlan(id: string) {
		const plan = await this.prisma.plan.findUnique({ where: { id } });
		if (!plan) throw new NotFoundException('Plan not found');
		if (!plan.isActive)
			throw new BadRequestException({
				reason: 'PLAN_INACTIVE',
				message: 'Plan is inactive',
			});
		return plan;
	}

	private async currentSubscription(
		tenantId: string,
	): Promise<SubscriptionWithPlan | null> {
		return this.prisma.subscription.findFirst({
			where: { tenantId, status: { not: 'CANCELLED' } },
			orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
			include: { plan: true },
		});
	}

	private subscriptionDates(dto: CreateSubscriptionDto) {
		const startDate = this.parseDate(dto.startDate, 'startDate');
		const endDate =
			dto.endDate == null ? null : this.parseDate(dto.endDate, 'endDate');
		const trialEndsAt =
			dto.trialEndsAt == null
				? null
				: this.parseDate(dto.trialEndsAt, 'trialEndsAt');
		if (endDate && endDate <= startDate)
			throw new BadRequestException({
				reason: 'INVALID_DATE_ORDER',
				message: 'endDate must be after startDate',
			});
		if (trialEndsAt && trialEndsAt <= startDate)
			throw new BadRequestException({
				reason: 'INVALID_DATE_ORDER',
				message: 'trialEndsAt must be after startDate',
			});
		if (!endDate && !trialEndsAt)
			throw new BadRequestException({
				reason: 'EXPIRY_REQUIRED',
				message: 'endDate or trialEndsAt is required',
			});
		if (endDate && trialEndsAt && trialEndsAt > endDate)
			throw new BadRequestException({
				reason: 'INVALID_DATE_ORDER',
				message: 'trialEndsAt must not be after endDate',
			});
		return { startDate, endDate, trialEndsAt };
	}

	private parseDate(value: string, field: string): Date {
		const date = new Date(value);
		if (Number.isNaN(date.getTime()))
			throw new BadRequestException({
				reason: 'INVALID_DATE',
				message: `${field} must be a valid ISO date`,
			});
		return date;
	}

	private addCycle(date: Date, cycle: BillingCycle): Date {
		const result = new Date(date);
		const day = result.getUTCDate();
		const months =
			cycle === BillingCycle.MONTHLY
				? 1
				: cycle === BillingCycle.QUARTERLY
					? 3
					: 12;
		result.setUTCDate(1);
		result.setUTCMonth(result.getUTCMonth() + months);
		const lastDay = new Date(
			Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
		).getUTCDate();
		result.setUTCDate(Math.min(day, lastDay));
		return result;
	}

	private expiry(
		row: Pick<SubscriptionWithPlan, 'endDate' | 'trialEndsAt'>,
	): Date | null {
		const dates = [row.endDate, row.trialEndsAt].filter(
			(value): value is Date => value !== null,
		);
		return dates.length
			? new Date(Math.min(...dates.map((date) => date.getTime())))
			: null;
	}

	private isEffective(row: SubscriptionWithPlan): boolean {
		const now = this.clock();
		const expiry = this.expiry(row);
		return (
			(row.status === SubscriptionStatus.ACTIVE ||
				row.status === SubscriptionStatus.TRIALING) &&
			row.startDate <= now &&
			(expiry === null || expiry > now)
		);
	}

	private subscriptionResponse(
		row: SubscriptionWithPlan,
	): SubscriptionResponse {
		const now = this.clock();
		const rowExpiry = this.expiry(row);
		const expired =
			row.status !== SubscriptionStatus.CANCELLED &&
			rowExpiry !== null &&
			rowExpiry <= now;
		return {
			id: row.id,
			tenantId: row.tenantId,
			planId: row.planId,
			plan: {
				id: row.plan.id,
				code: row.plan.code,
				name: row.plan.name,
				isActive: row.plan.isActive,
			},
			status: expired ? SubscriptionStatus.EXPIRED : row.status,
			billingCycle: row.billingCycle,
			startDate: row.startDate.toISOString(),
			endDate: row.endDate?.toISOString() ?? null,
			trialEndsAt: row.trialEndsAt?.toISOString() ?? null,
			cancelledAt: row.cancelledAt?.toISOString() ?? null,
			manualReference: row.manualReference,
			reason: row.reason,
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
		};
	}

	private subscriptionAudit(
		ctx: PlanAuditContext,
		action: AuditAction,
		id: string,
		before?: SubscriptionResponse,
	): AuditInput {
		return {
			actorId: ctx.actorId,
			actorType: AuditActorType.PLATFORM_ADMIN,
			actorRoleCode: ctx.actorRoleCode,
			action,
			resource: 'subscription',
			resourceId: id,
			before,
			ipAddress: ctx.ipAddress,
			userAgent: ctx.userAgent?.slice(0, 512),
		};
	}

	private async closeSubscription(
		tx: Prisma.TransactionClient,
		tenantId: string,
		row: SubscriptionWithPlan,
		input: AuditInput,
	) {
		const result = await tx.subscription.updateMany({
			where: {
				id: row.id,
				tenantId,
				updatedAt: row.updatedAt,
				status: { not: 'CANCELLED' },
			},
			data: { status: SubscriptionStatus.CANCELLED, cancelledAt: this.clock() },
		});
		if (result.count === 0)
			throw await this.ensureSubscriptionConflict(tx, tenantId, row.id);
		void input;
	}

	private async ensureSubscriptionConflict(
		tx: Prisma.TransactionClient,
		tenantId: string,
		id: string,
	): Promise<never> {
		const row = await tx.subscription.findFirst({
			where: { id, tenantId },
			select: { id: true },
		});
		if (!row) throw new NotFoundException('Subscription not found');
		throw this.staleSubscription();
	}

	private staleSubscription(): ConflictException {
		return new ConflictException({
			reason: 'STALE_UPDATE',
			message: 'Subscription was modified by another request',
		});
	}

	private planCreateData(
		dto: CreatePlanDto,
		featureIds: string[],
	): Prisma.PlanCreateInput {
		void featureIds;
		return {
			code: dto.code,
			name: dto.name,
			description: dto.description ?? null,
			price: BigInt(dto.price),
			billingCycle: dto.billingCycle,
			maxUsers: dto.maxUsers,
			maxWarehouses: dto.maxWarehouses,
			maxProducts: dto.maxProducts ?? null,
			maxCustomers: dto.maxCustomers ?? null,
			maxOrdersPerMonth: dto.maxOrdersPerMonth ?? null,
			maxStorageBytes: BigInt(dto.maxStorageBytes),
		};
	}

	private planUpdateData(
		dto: UpdatePlanDto,
	): Prisma.PlanUpdateManyMutationInput {
		const data: Prisma.PlanUpdateManyMutationInput = {};
		for (const field of [
			'name',
			'description',
			'billingCycle',
			'maxUsers',
			'maxWarehouses',
			'maxProducts',
			'maxCustomers',
			'maxOrdersPerMonth',
		] as const) {
			if (dto[field] !== undefined) data[field] = dto[field] as never;
		}
		if (dto.price !== undefined) data.price = BigInt(dto.price);
		if (dto.maxStorageBytes !== undefined)
			data.maxStorageBytes = BigInt(dto.maxStorageBytes);
		return data;
	}

	private auditInput(
		ctx: PlanAuditContext,
		action: AuditAction,
		id: string,
		snapshots: { before?: unknown; after?: unknown },
	): AuditInput {
		return {
			actorId: ctx.actorId,
			actorType: AuditActorType.PLATFORM_ADMIN,
			actorRoleCode: ctx.actorRoleCode,
			action,
			resource: 'plan',
			resourceId: id,
			...snapshots,
			ipAddress: ctx.ipAddress,
			userAgent: ctx.userAgent?.slice(0, 512),
		};
	}

	private parseExpected(value: string): Date {
		const date = new Date(value);
		if (Number.isNaN(date.getTime()))
			throw new BadRequestException({
				reason: 'INVALID_EXPECTED_UPDATED_AT',
				message: 'expectedUpdatedAt must be a valid ISO date',
			});
		return date;
	}

	private stale(): ConflictException {
		return new ConflictException({
			reason: 'STALE_UPDATE',
			message: 'Plan was modified by another request',
		});
	}

	private async ensurePlanConflict(
		tx: Prisma.TransactionClient,
		id: string,
	): Promise<never> {
		if (!(await tx.plan.findUnique({ where: { id }, select: { id: true } })))
			throw new NotFoundException('Plan not found');
		throw this.stale();
	}

	private rethrowPrismaConflict(error: unknown, reason: string): void {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === 'P2002'
		) {
			throw new ConflictException({
				reason,
				message: 'Plan code already exists',
			});
		}
	}

	private toResponse(row: PlanWithFeatures): PlanResponse {
		return {
			id: row.id,
			code: row.code,
			name: row.name,
			description: row.description,
			price: row.price.toString(),
			billingCycle: row.billingCycle,
			isActive: row.isActive,
			quotas: {
				maxUsers: row.maxUsers,
				maxWarehouses: row.maxWarehouses,
				maxProducts: row.maxProducts,
				maxCustomers: row.maxCustomers,
				maxOrdersPerMonth: row.maxOrdersPerMonth,
				maxStorageBytes: row.maxStorageBytes.toString(),
			},
			featureCodes: row.features.map(({ feature }) => feature.code).sort(),
			createdAt: row.createdAt.toISOString(),
			updatedAt: row.updatedAt.toISOString(),
		};
	}
}
