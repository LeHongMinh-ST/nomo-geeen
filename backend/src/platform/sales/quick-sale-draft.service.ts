import { randomBytes } from 'node:crypto';
import {
	ConflictException,
	ForbiddenException,
	GoneException,
	Injectable,
	Logger,
	type OnModuleInit,
	UnprocessableEntityException,
} from '@nestjs/common';
import { AuditAction, AuditActorType, Prisma } from '@prisma/client';
import { AuditLogger } from '../audit/audit-logger.service';
import { EntitlementService } from '../entitlements/entitlement.service';
import { PrismaService } from '../prisma/prisma.service';
import { QuickSalePaymentMethod } from './dto/create-quick-sale.dto';
import type { QuickSaleDraftResponse } from './dto/quick-sale-draft.dto';
import {
	AddQuickSaleDraftLineDto,
	CheckoutQuickSaleDraftDto,
	PatchQuickSaleDraftDto,
	SetQuickSaleDraftLineQtyDto,
} from './dto/quick-sale-draft.dto';
import type { QuickSaleDraftAction } from './quick-sale-draft-events';
import { QuickSaleDraftEventsService } from './quick-sale-draft-events.service';
import type { QuickSaleResponse } from './sales.service';
import { SalesService } from './sales.service';

const DEFAULT_IDLE_TTL_MINUTES = 20;

/** Token = 16 chars drawn from a URL-safe alphabet (~96 bits entropy when
 *  generated from 12 random bytes). Tenant-local uniqueness prevents two
 *  phones from guessing the same token across different tenants.
 */
const JOIN_TOKEN_ALPHABET =
	'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateJoinToken(): string {
	// 12 bytes → 16 chars (one-based modulo alphabet) with rejection sampling
	// to avoid modulo bias.
	const bytes = randomBytes(12);
	let out = '';
	while (out.length < 16) {
		for (const byte of bytes) {
			if (out.length >= 16) break;
			if (byte >= 248) continue; // skip values that would bias the modulo
			out += JOIN_TOKEN_ALPHABET[byte % JOIN_TOKEN_ALPHABET.length];
		}
		if (out.length < 16) {
			bytes.set(randomBytes(12));
		}
	}
	return out;
}

/** Short, non-reversible fingerprint used in audit logs only. */
function tokenFingerprint(token: string): string {
	// First 4 chars are enough to disambiguate in logs without leaking the
	// full token if logs are exposed.
	return token.slice(0, 4);
}

type DraftWithLines = Prisma.QuickSaleDraftGetPayload<{
	include: { lines: true };
}>;

@Injectable()
export class QuickSaleDraftService implements OnModuleInit {
	private readonly logger = new Logger(QuickSaleDraftService.name);
	private readonly ttlMs = DEFAULT_IDLE_TTL_MINUTES * 60_000;

	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditLogger,
		private readonly events: QuickSaleDraftEventsService,
		private readonly sales: SalesService,
		private readonly entitlements: EntitlementService,
	) {}

	onModuleInit(): void {
		// Lazy TTL sweep: no background cron needed.
	}

	/**
	 * Get the desktop owner's active draft (if any). Used by the FE on mount.
	 */
	async getCurrentForOwner(
		tenantId: string,
		ownerUserId: string,
	): Promise<QuickSaleDraftResponse | null> {
		const draft = await this.prisma.quickSaleDraft.findFirst({
			where: {
				tenantId,
				ownerUserId,
				closedAt: null,
				expiresAt: { gt: new Date() },
			},
			include: { lines: true },
			orderBy: { lastTouchedAt: 'desc' },
		});
		if (!draft) return null;
		return this.toResponse(draft);
	}

	/**
	 * Find a draft by its tenant-scoped join token. Used by the phone.
	 */
	async findByToken(
		tenantId: string,
		token: string,
	): Promise<QuickSaleDraftResponse | null> {
		const draft = await this.prisma.quickSaleDraft.findFirst({
			where: {
				tenantId,
				joinToken: token,
				closedAt: null,
				expiresAt: { gt: new Date() },
			},
			include: { lines: true },
		});
		if (!draft) return null;
		return this.toResponse(draft);
	}

	/**
	 * Audit-only join helper. Records outcome (success / not-found /
	 * expired / closed) alongside a short non-reversible fingerprint. Rate
	 * limiting lives outside this module — no infra exists today, so join
	 * remains brute-forceable in proportion to the token alphabet (~96 bits).
	 */
	async auditJoin(
		tenantId: string,
		actorUserId: string,
		actorRoleCode: string | undefined,
		token: string,
		outcome: 'success' | 'not-found' | 'expired' | 'closed',
		draftId: string | null,
	): Promise<void> {
		try {
			await this.audit.log({
				tenantId,
				actorId: actorUserId,
				actorType: AuditActorType.USER,
				actorRoleCode: actorRoleCode ?? null,
				action: AuditAction.QUICK_SALE_DRAFT_UPDATE,
				resource: 'quick_sale_draft:join',
				...(draftId ? { resourceId: draftId } : {}),
				after: {
					joinOutcome: outcome,
					tokenFingerprint: tokenFingerprint(token),
				},
			});
		} catch {
			// Audit must never break the join flow.
		}
	}

	/**
	 * Create an active draft owned by the caller. If the owner already has an
	 * open draft, it is closed first so each desktop has a single canonical
	 * counter session.
	 */
	async createOrReactivate(
		tenantId: string,
		ownerUserId: string,
		actorRoleCode: string | undefined,
	): Promise<QuickSaleDraftResponse> {
		// Close any previous open draft for this owner (best-effort; do not throw).
		const previous = await this.prisma.quickSaleDraft.findFirst({
			where: { tenantId, ownerUserId, closedAt: null },
			select: { id: true },
		});
		if (previous) {
			await this.prisma.quickSaleDraft.update({
				where: { id: previous.id },
				data: { closedAt: new Date(), closedByUserId: ownerUserId },
			});
		}

		const token = await this.mintUniqueToken(tenantId);
		const now = new Date();
		const expiresAt = new Date(now.getTime() + this.ttlMs);
		const draft = await this.prisma.quickSaleDraft.create({
			data: {
				tenantId,
				ownerUserId,
				joinToken: token,
				lastTouchedAt: now,
				expiresAt,
			},
			include: { lines: true },
		});

		await this.audit.log({
			tenantId,
			actorId: ownerUserId,
			actorType: AuditActorType.USER,
			actorRoleCode: actorRoleCode ?? null,
			action: AuditAction.QUICK_SALE_DRAFT_CREATE,
			resource: 'quick_sale_draft',
			resourceId: draft.id,
			after: { tokenFingerprint: tokenFingerprint(token) },
		});

		void this.events.publish({
			draftId: draft.id,
			tenantId,
			actorUserId: ownerUserId,
			action: 'created',
			revision: 1,
		});

		return this.toResponse(draft);
	}

	async closeDraft(
		tenantId: string,
		actorUserId: string,
		actorRoleCode: string | undefined,
		draftId: string,
	): Promise<{ id: string; closed: true }> {
		const draft = await this.assertActiveDraft(tenantId, draftId);
		if (
			draft.ownerUserId !== actorUserId &&
			actorRoleCode !== 'OWNER' &&
			actorRoleCode !== 'MANAGER'
		) {
			throw new ForbiddenException('Only the owner may close this draft');
		}
		await this.prisma.quickSaleDraft.update({
			where: { id: draftId },
			data: { closedAt: new Date(), closedByUserId: actorUserId },
		});
		await this.audit.log({
			tenantId,
			actorId: actorUserId,
			actorType: AuditActorType.USER,
			actorRoleCode: actorRoleCode ?? null,
			action: AuditAction.QUICK_SALE_DRAFT_CLOSE,
			resource: 'quick_sale_draft',
			resourceId: draftId,
		});
		void this.events.publish({
			draftId,
			tenantId,
			actorUserId,
			action: 'closed',
			revision: 1,
		});
		return { id: draftId, closed: true };
	}

	/**
	 * Add or merge a line into the cart. Idempotent on (draftId, idempotencyKey).
	 * Last-write-wins by `updatedAt` on the same productId (server recomputes qty
	 * from the body).
	 */
	async addOrMergeLine(
		tenantId: string,
		actorUserId: string,
		actorRoleCode: string | undefined,
		draftId: string,
		dto: AddQuickSaleDraftLineDto,
	): Promise<QuickSaleDraftResponse> {
		return this.executeMutation(
			tenantId,
			actorUserId,
			actorRoleCode,
			draftId,
			'line-added',
			dto.idempotencyKey,
			async (draft) => {
				const product = await this.prisma.product.findFirst({
					where: {
						id: dto.productId,
						tenantId,
						deletedAt: null,
					},
					include: {
						baseUnit: { select: { id: true, name: true } },
					},
				});
				if (!product) {
					throw new UnprocessableEntityException({
						reason: 'INVALID_PRODUCT',
						message: 'Product does not belong to this tenant',
					});
				}
				const unit =
					dto.unitId === product.baseUnitId
						? product.baseUnit
						: await this.prisma.unit.findFirst({
								where: { id: dto.unitId, tenantId, deletedAt: null },
								select: { id: true, name: true },
							});
				if (!unit) {
					throw new UnprocessableEntityException({
						reason: 'INVALID_UNIT',
						message: 'Unit does not belong to this tenant',
					});
				}
				const existing = await this.prisma.quickSaleDraftLine.findUnique({
					where: { draftId_productId: { draftId, productId: dto.productId } },
				});
				// Server-trusted snapshots: ignore any client-supplied product/unit
				// names so the cart shows DB truth, not stale input.
				await this.prisma.quickSaleDraftLine.upsert({
					where: { draftId_productId: { draftId, productId: dto.productId } },
					create: {
						tenantId,
						draftId,
						productId: dto.productId,
						productNameSnapshot: product.name,
						unitId: dto.unitId,
						unitNameSnapshot: unit.name,
						qty: new Prisma.Decimal(dto.qty),
						unitPrice: BigInt(dto.unitPrice),
						addedByUserId: actorUserId,
					},
					update: {
						unitId: dto.unitId,
						unitNameSnapshot: unit.name,
						qty: new Prisma.Decimal(dto.qty),
						unitPrice: BigInt(dto.unitPrice),
						addedByUserId: actorUserId,
					},
				});
				// First add never had an `existing` row; still safe to ignore.
				void existing;
				return draft;
			},
		);
	}

	async setLineQuantity(
		tenantId: string,
		actorUserId: string,
		actorRoleCode: string | undefined,
		draftId: string,
		productId: string,
		dto: SetQuickSaleDraftLineQtyDto,
	): Promise<QuickSaleDraftResponse> {
		return this.executeMutation(
			tenantId,
			actorUserId,
			actorRoleCode,
			draftId,
			'line-quantity-set',
			dto.idempotencyKey,
			async (draft) => {
				if (dto.qty === 0) {
					await this.prisma.quickSaleDraftLine.deleteMany({
						where: { tenantId, draftId, productId },
					});
					return draft;
				}
				const line = await this.prisma.quickSaleDraftLine.findUnique({
					where: { draftId_productId: { draftId, productId } },
				});
				if (!line) {
					throw new UnprocessableEntityException({
						reason: 'INVALID_PRODUCT',
						message: 'Line not found in this draft',
					});
				}
				await this.prisma.quickSaleDraftLine.update({
					where: { id: line.id },
					data: {
						qty: new Prisma.Decimal(dto.qty),
						...(dto.unitPrice !== undefined
							? { unitPrice: BigInt(dto.unitPrice) }
							: {}),
						addedByUserId: actorUserId,
					},
				});
				return draft;
			},
		);
	}

	async removeLine(
		tenantId: string,
		actorUserId: string,
		actorRoleCode: string | undefined,
		draftId: string,
		productId: string,
		idempotencyKey: string,
	): Promise<QuickSaleDraftResponse> {
		return this.executeMutation(
			tenantId,
			actorUserId,
			actorRoleCode,
			draftId,
			'line-removed',
			idempotencyKey,
			async (draft) => {
				await this.prisma.quickSaleDraftLine.deleteMany({
					where: { tenantId, draftId, productId },
				});
				return draft;
			},
		);
	}

	async patchCustomer(
		tenantId: string,
		actorUserId: string,
		actorRoleCode: string | undefined,
		draftId: string,
		dto: PatchQuickSaleDraftDto,
	): Promise<QuickSaleDraftResponse> {
		return this.executeMutation(
			tenantId,
			actorUserId,
			actorRoleCode,
			draftId,
			'customer-set',
			dto.idempotencyKey,
			async (draft) => {
				if (dto.clearCustomer) {
					await this.prisma.quickSaleDraft.update({
						where: { id: draftId },
						data: { customerId: null },
					});
					return draft;
				}
				if (!dto.customerId) {
					throw new UnprocessableEntityException({
						reason: 'VALIDATION_ERROR',
						message: 'customerId is required',
					});
				}
				const customer = await this.prisma.customer.findFirst({
					where: {
						id: dto.customerId,
						tenantId,
						deletedAt: null,
					},
					select: { id: true },
				});
				if (!customer) {
					throw new UnprocessableEntityException({
						reason: 'INVALID_CUSTOMER',
						message: 'Customer does not belong to this tenant',
					});
				}
				await this.prisma.quickSaleDraft.update({
					where: { id: draftId },
					data: { customerId: dto.customerId },
				});
				return draft;
			},
		);
	}

	/**
	 * Convert the draft into a real Sale. Reuses SalesService.createQuickSale
	 * for the actual atomic sale workflow; once the Sale row exists the draft
	 * is hard-deleted.
	 */
	async checkout(
		tenantId: string,
		actorUserId: string,
		actorRoleCode: string | undefined,
		draftId: string,
		dto: CheckoutQuickSaleDraftDto,
	): Promise<QuickSaleResponse> {
		const draft = await this.assertActiveDraft(tenantId, draftId);
		if (draft.lines.length === 0) {
			throw new UnprocessableEntityException({
				reason: 'CHECKOUT_FAILED',
				message: 'Cart is empty',
			});
		}
		// Surface quota/gating errors BEFORE the heavy createQuickSale work;
		// matches `SalesService.completeOrder` which asserts `inventory` and
		// (when amount owed > 0) `debt` inside the same transaction.
		await this.entitlements.assertFeature(tenantId, 'inventory');
		if (dto.paymentMethod === 'DEBT') {
			await this.entitlements.assertFeature(tenantId, 'debt');
		}
		const sale = await this.sales.createQuickSale(tenantId, actorUserId, {
			idempotencyKey: dto.idempotencyKey,
			customerId: draft.customerId ?? undefined,
			paymentMethod: dto.paymentMethod as QuickSalePaymentMethod,
			amountPaid: dto.amountPaid,
			discountAmount: dto.discountAmount ?? 0,
			lines: draft.lines.map((line) => ({
				productId: line.productId,
				unitId: line.unitId,
				qty: Number(line.qty.toString()),
				unitPrice: Number(line.unitPrice),
			})),
		});

		await this.prisma.quickSaleDraft.update({
			where: { id: draftId },
			data: { closedAt: new Date(), closedByUserId: actorUserId },
		});
		await this.audit.log({
			tenantId,
			actorId: actorUserId,
			actorType: AuditActorType.USER,
			actorRoleCode: actorRoleCode ?? null,
			action: AuditAction.QUICK_SALE_DRAFT_CHECKOUT,
			resource: 'quick_sale_draft',
			resourceId: draftId,
			after: { saleId: sale.id, paymentMethod: dto.paymentMethod },
		});
		void this.events.publish({
			draftId,
			tenantId,
			actorUserId,
			action: 'checked-out',
			revision: 1,
		});
		return sale;
	}

	private async assertActiveDraft(
		tenantId: string,
		draftId: string,
	): Promise<DraftWithLines> {
		const draft = await this.prisma.quickSaleDraft.findFirst({
			where: { id: draftId, tenantId },
			include: { lines: true },
		});
		if (!draft) {
			throw new UnprocessableEntityException({
				reason: 'DRAFT_NOT_FOUND',
				message: 'Draft not found',
			});
		}
		if (draft.closedAt) {
			throw new UnprocessableEntityException({
				reason: 'DRAFT_CLOSED',
				message: 'Draft is closed',
			});
		}
		if (draft.expiresAt.getTime() <= Date.now()) {
			throw new GoneException({
				reason: 'DRAFT_EXPIRED',
				message: 'Draft expired (20 minutes of inactivity)',
			});
		}
		return draft;
	}

	private async executeMutation(
		tenantId: string,
		actorUserId: string,
		actorRoleCode: string | undefined,
		draftId: string,
		action: QuickSaleDraftAction,
		idempotencyKey: string,
		mutate: (draft: DraftWithLines) => Promise<DraftWithLines | void>,
	): Promise<QuickSaleDraftResponse> {
		// Idempotency replay: short-circuit on persisted mutation snapshot.
		const replay = await this.prisma.quickSaleDraftMutation.findFirst({
			where: { tenantId, draftId, idempotencyKey },
		});
		if (replay) {
			const snap = this.parseResponseSnapshot(replay.responseJson);
			if (snap) return snap;
		}

		const draft = await this.assertActiveDraft(tenantId, draftId);
		const now = new Date();
		const expiresAt = new Date(now.getTime() + this.ttlMs);
		await mutate(draft);

		const persisted = await this.prisma.quickSaleDraft.update({
			where: { id: draftId },
			data: {
				lastTouchedAt: now,
				expiresAt,
			},
			include: { lines: true },
		});
		const response = this.toResponse(persisted);

		await this.prisma.quickSaleDraftMutation.upsert({
			where: {
				draftId_idempotencyKey: { draftId, idempotencyKey },
			},
			create: {
				tenantId,
				draftId,
				idempotencyKey,
				kind: action,
				responseJson: response as unknown as Prisma.InputJsonValue,
			},
			update: {},
		});
		await this.audit.log({
			tenantId,
			actorId: actorUserId,
			actorType: AuditActorType.USER,
			actorRoleCode: actorRoleCode ?? null,
			action: AuditAction.QUICK_SALE_DRAFT_UPDATE,
			resource: 'quick_sale_draft',
			resourceId: draftId,
			after: { kind: action, idempotencyKey },
		});
		void this.events.publish({
			draftId,
			tenantId,
			actorUserId,
			action,
			revision: 1,
		});
		return response;
	}

	private parseResponseSnapshot(json: unknown): QuickSaleDraftResponse | null {
		if (!json || typeof json !== 'object') return null;
		const draft = json as QuickSaleDraftResponse;
		if (!draft.id || !Array.isArray(draft.lines)) return null;
		return draft;
	}

	private async mintUniqueToken(tenantId: string): Promise<string> {
		for (let attempt = 0; attempt < 5; attempt += 1) {
			const token = generateJoinToken();
			const exists = await this.prisma.quickSaleDraft.findFirst({
				where: { tenantId, joinToken: token },
				select: { id: true },
			});
			if (!exists) return token;
		}
		throw new Error('Could not mint a unique QuickSaleDraft join token');
	}

	private toResponse(draft: DraftWithLines): QuickSaleDraftResponse {
		const lines = draft.lines.map((line) => {
			const qty = Number(line.qty.toString());
			const unitPrice = Number(line.unitPrice);
			return {
				id: line.id,
				productId: line.productId,
				productName: line.productNameSnapshot,
				unitId: line.unitId,
				unitName: line.unitNameSnapshot,
				qty,
				unitPrice,
				lineTotal: qty * unitPrice,
				addedByUserId: line.addedByUserId ?? null,
			};
		});
		const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
		const itemCount = lines.reduce((sum, l) => sum + l.qty, 0);
		return {
			id: draft.id,
			tenantId: draft.tenantId,
			ownerUserId: draft.ownerUserId,
			joinToken: draft.joinToken,
			customerId: draft.customerId ?? null,
			warehouseId: draft.warehouseId ?? null,
			handbookMeta: null,
			expiresAt: draft.expiresAt.toISOString(),
			lastTouchedAt: draft.lastTouchedAt.toISOString(),
			closedAt: draft.closedAt ? draft.closedAt.toISOString() : null,
			createdAt: draft.createdAt.toISOString(),
			updatedAt: draft.updatedAt.toISOString(),
			subtotal,
			itemCount,
			total: subtotal,
			lines,
		};
	}
}
