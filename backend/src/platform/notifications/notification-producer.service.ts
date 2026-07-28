import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma, ProductStatus } from '@prisma/client';
import { classifyExpiry, worstExpiryTier } from '../inventory/expiry-policy';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationEventsService } from './notification-events.service';

const DEFAULT_LOW_STOCK_THRESHOLD = 10;
const VN_TZ = 'Asia/Ho_Chi_Minh';

export type ProducerSyncResult = {
	dayKey: string;
	created: number;
	updated: number;
	skipped: number;
	debtOwingCustomers: number;
	lowStockProducts: number;
	nearExpiryProducts: number;
};

/**
 * Runtime in-app notification producers from live tenant data.
 * Idempotent per (tenant, type, object-scope, day) via Notification.dedupeKey.
 * No BullMQ yet — invoked by POST /tenant/notifications/sync and future cron.
 * After create/update, publishes SSE fan-out (list/unread remain source of truth).
 */
@Injectable()
export class NotificationProducerService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly events: NotificationEventsService,
	) {}

	async syncTenant(
		tenantId: string,
		now = new Date(),
	): Promise<ProducerSyncResult> {
		const dayKey = this.vnDateKey(now);
		const debt = await this.syncDebtDue(tenantId, dayKey);
		const low = await this.syncLowStock(tenantId, dayKey, now);
		const near = await this.syncNearExpiry(tenantId, dayKey, now);
		return {
			dayKey,
			created: debt.created + low.created + near.created,
			updated: debt.updated + low.updated + near.updated,
			skipped: debt.skipped + low.skipped + near.skipped,
			debtOwingCustomers: debt.count,
			lowStockProducts: low.count,
			nearExpiryProducts: near.count,
		};
	}

	/** Customers with outstanding receivable balance — daily tenant digest. */
	async syncDebtDue(
		tenantId: string,
		dayKey: string,
	): Promise<{
		created: number;
		updated: number;
		skipped: number;
		count: number;
	}> {
		const agg = await this.prisma.customer.aggregate({
			where: { tenantId, deletedAt: null, balance: { gt: 0n } },
			_count: { _all: true },
			_sum: { balance: true },
		});
		const count = agg._count._all;
		if (count === 0) {
			return { created: 0, updated: 0, skipped: 1, count: 0 };
		}
		const total = agg._sum.balance ?? 0n;
		const title =
			count === 1 ? 'Có 1 khách còn công nợ' : `Có ${count} khách còn công nợ`;
		const body = `Tổng phải thu ${this.formatVnd(total)}. Mở Công nợ để thu hồi.`;
		const result = await this.upsertDedupe({
			tenantId,
			dedupeKey: `DEBT_DUE:digest:${dayKey}`,
			type: NotificationType.DEBT_DUE,
			title,
			body,
		});
		return { ...result, count };
	}

	/** Active products with warehouse stock qty in (0, threshold]. */
	async syncLowStock(
		tenantId: string,
		dayKey: string,
		now = new Date(),
	): Promise<{
		created: number;
		updated: number;
		skipped: number;
		count: number;
	}> {
		void now;
		const settings = await this.prisma.tenantSettings.findUnique({
			where: { tenantId },
			select: { lowStockThresholdDefault: true },
		});
		const raw = settings?.lowStockThresholdDefault
			? Number(settings.lowStockThresholdDefault)
			: DEFAULT_LOW_STOCK_THRESHOLD;
		const threshold =
			Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_LOW_STOCK_THRESHOLD;

		const stocks = await this.prisma.stock.findMany({
			where: {
				tenantId,
				qty: { gt: 0, lte: threshold },
				product: { status: ProductStatus.ACTIVE, deletedAt: null },
			},
			select: {
				productId: true,
				qty: true,
				product: { select: { name: true } },
			},
			take: 200,
		});
		// Collapse multi-warehouse rows per product (min qty signal still counts once).
		const byProduct = new Map<string, { name: string; qty: number }>();
		for (const row of stocks) {
			const qty = Number(row.qty);
			const prev = byProduct.get(row.productId);
			if (!prev || qty < prev.qty) {
				byProduct.set(row.productId, {
					name: row.product.name,
					qty,
				});
			}
		}
		const count = byProduct.size;
		if (count === 0) {
			return { created: 0, updated: 0, skipped: 1, count: 0 };
		}
		const sample = [...byProduct.values()]
			.slice(0, 3)
			.map((p) => p.name)
			.join(', ');
		const title =
			count === 1 ? '1 mặt hàng sắp hết' : `${count} mặt hàng sắp hết`;
		const body = `Dưới ngưỡng ${threshold}: ${sample}${count > 3 ? '…' : ''}. Kiểm tra kho để nhập bổ sung.`;
		const result = await this.upsertDedupe({
			tenantId,
			dedupeKey: `LOW_STOCK:digest:${dayKey}`,
			type: NotificationType.LOW_STOCK,
			title,
			body,
		});
		return { ...result, count };
	}

	/** Products with live batches in EXPIRED/CRITICAL/WARNING tiers. */
	async syncNearExpiry(
		tenantId: string,
		dayKey: string,
		now = new Date(),
	): Promise<{
		created: number;
		updated: number;
		skipped: number;
		count: number;
	}> {
		const batches = await this.prisma.productBatch.findMany({
			where: {
				tenantId,
				qtyOnHand: { gt: 0 },
				isRecalled: false,
				expiresAt: { not: null },
				product: { status: ProductStatus.ACTIVE, deletedAt: null },
			},
			select: {
				productId: true,
				expiresAt: true,
				product: { select: { name: true } },
			},
			take: 500,
		});
		const worstByProduct = new Map<
			string,
			{ name: string; tier: ReturnType<typeof classifyExpiry> }
		>();
		for (const batch of batches) {
			const tier = classifyExpiry(batch.expiresAt, now);
			if (tier !== 'EXPIRED' && tier !== 'CRITICAL' && tier !== 'WARNING') {
				continue;
			}
			const prev = worstByProduct.get(batch.productId);
			const next = { name: batch.product.name, tier };
			if (!prev) {
				worstByProduct.set(batch.productId, next);
				continue;
			}
			if (worstExpiryTier([prev.tier, tier]) === tier && prev.tier !== tier) {
				worstByProduct.set(batch.productId, next);
			}
		}
		const count = worstByProduct.size;
		if (count === 0) {
			return { created: 0, updated: 0, skipped: 1, count: 0 };
		}
		const sample = [...worstByProduct.values()]
			.slice(0, 3)
			.map((p) => p.name)
			.join(', ');
		const title =
			count === 1 ? '1 mặt hàng gần/hết hạn' : `${count} mặt hàng gần/hết hạn`;
		const body = `Trong 90 ngày hoặc đã hết hạn: ${sample}${count > 3 ? '…' : ''}. Ưu tiên bán trước.`;
		const result = await this.upsertDedupe({
			tenantId,
			dedupeKey: `NEAR_EXPIRED:digest:${dayKey}`,
			type: NotificationType.NEAR_EXPIRED,
			title,
			body,
		});
		return { ...result, count };
	}

	/**
	 * Create-or-refresh one digest row. Same dedupeKey same day → update copy, no spam row.
	 */
	async upsertDedupe(input: {
		tenantId: string;
		dedupeKey: string;
		type: NotificationType;
		title: string;
		body: string;
	}): Promise<{ created: number; updated: number; skipped: number }> {
		const existing = await this.prisma.notification.findUnique({
			where: {
				tenantId_dedupeKey: {
					tenantId: input.tenantId,
					dedupeKey: input.dedupeKey,
				},
			},
			select: { id: true, title: true, body: true },
		});
		if (existing) {
			if (existing.title === input.title && existing.body === input.body) {
				return { created: 0, updated: 0, skipped: 1 };
			}
			await this.prisma.notification.update({
				where: { id: existing.id },
				data: { title: input.title, body: input.body },
			});
			await this.events.publish({
				tenantId: input.tenantId,
				userId: null,
				notificationId: existing.id,
				action: 'updated',
			});
			return { created: 0, updated: 1, skipped: 0 };
		}
		try {
			const created = await this.prisma.notification.create({
				data: {
					tenantId: input.tenantId,
					userId: null,
					type: input.type,
					title: input.title,
					body: input.body,
					dedupeKey: input.dedupeKey,
				},
				select: { id: true },
			});
			await this.events.publish({
				tenantId: input.tenantId,
				userId: null,
				notificationId: created.id,
				action: 'created',
			});
			return { created: 1, updated: 0, skipped: 0 };
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === 'P2002'
			) {
				return { created: 0, updated: 0, skipped: 1 };
			}
			throw error;
		}
	}

	vnDateKey(now: Date): string {
		return new Intl.DateTimeFormat('en-CA', {
			timeZone: VN_TZ,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).format(now);
	}

	private formatVnd(amount: bigint): string {
		return `${amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}đ`;
	}
}
