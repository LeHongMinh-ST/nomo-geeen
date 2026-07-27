import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
	classifyExpiry,
	daysToExpiry,
	EXPIRY_TIER_DAYS,
	EXPIRY_TIERS,
	emptyTierCounts,
	worstExpiryTier,
} from './expiry-policy';

@Injectable()
export class InventoryService {
	constructor(private readonly prisma: PrismaService) {}
	async list(
		tenantId: string,
		query: { page?: number; pageSize?: number; search?: string },
	) {
		const page = Math.max(1, query.page ?? 1);
		const pageSize = Math.min(20, Math.max(1, query.pageSize ?? 20));
		const search = query.search?.trim();
		const where: Prisma.StockWhereInput = {
			tenantId,
			...(search
				? {
						product: {
							OR: [
								{ name: { contains: search, mode: 'insensitive' } },
								{ sku: { contains: search, mode: 'insensitive' } },
							],
						},
					}
				: {}),
		};
		const [rows, total] = await Promise.all([
			this.prisma.stock.findMany({
				where,
				orderBy: { updatedAt: 'desc' },
				skip: (page - 1) * pageSize,
				take: pageSize,
				include: {
					product: {
						select: {
							name: true,
							sku: true,
							baseUnitId: true,
							baseUnit: { select: { id: true, name: true } },
							batches: {
								select: {
									id: true,
									tenantId: true,
									batchCode: true,
									expiresAt: true,
									qtyOnHand: true,
									warehouseId: true,
									healthState: true,
									version: true,
								},
							},
						},
					},
				},
			}),
			this.prisma.stock.count({ where }),
		]);
		// One clock for the whole response so every row is classified consistently.
		const now = new Date();
		return {
			items: rows.map((row) => this.toItem(row, now, tenantId)),
			page,
			pageSize,
			total,
		};
	}
	async detail(tenantId: string, productId: string) {
		const row = await this.prisma.stock.findFirst({
			where: { tenantId, productId },
			include: {
				product: {
					select: {
						name: true,
						sku: true,
						baseUnitId: true,
						baseUnit: { select: { id: true, name: true } },
						batches: {
							select: {
								id: true,
								tenantId: true,
								batchCode: true,
								expiresAt: true,
								qtyOnHand: true,
								warehouseId: true,
								healthState: true,
								version: true,
							},
						},
					},
				},
			},
		});
		if (!row) throw new NotFoundException('Inventory item not found');
		const movements = await this.prisma.stockMovement.findMany({
			where: { tenantId, productId, warehouseId: row.warehouseId },
			orderBy: { occurredAt: 'desc' },
			take: 100,
		});
		return {
			...this.toItem(row, new Date(), tenantId),
			movements: movements.map((movement) => ({
				id: movement.id,
				productId: movement.productId,
				warehouseId: movement.warehouseId,
				direction: movement.direction,
				qty: movement.qty.toString(),
				unitCost: movement.unitCost?.toString() ?? null,
				reason: movement.reason,
				refType: movement.refType,
				refId: movement.refId,
				occurredAt: movement.occurredAt,
			})),
		};
	}
	/**
	 * Tenant-wide inventory warnings (catalog §14.1: sắp hết hạn, hết hạn,
	 * thu hồi, ngừng lưu hành). Counted over the same batches the list surfaces
	 * — in-warehouse and still holding stock — so tiles match the rows.
	 */
	async expirySummary(tenantId: string) {
		const now = new Date();
		const pageSize = 500;
		const batchCounts = emptyTierCounts();
		const itemCounts = emptyTierCounts();
		let batchTotal = 0;
		let recalledBatches = 0;
		let recalledItems = 0;
		let inactiveItems = 0;
		let itemTotal = 0;
		for (let skip = 0; ; skip += pageSize) {
			const rows = await this.prisma.stock.findMany({
				where: { tenantId },
				take: pageSize,
				skip,
				select: {
					warehouseId: true,
					product: {
						select: {
							status: true,
							isRecalled: true,
							batches: {
								where: { tenantId, qtyOnHand: { gt: 0 } },
								select: {
									tenantId: true,
									expiresAt: true,
									qtyOnHand: true,
									warehouseId: true,
									isRecalled: true,
								},
							},
						},
					},
				},
			});
			itemTotal += rows.length;
			for (const row of rows) {
				const batches = this.liveBatches(
					row.product.batches,
					row.warehouseId,
					tenantId,
				);
				const tiers = batches.map((batch) =>
					classifyExpiry(batch.expiresAt, now),
				);
				for (const tier of tiers) {
					batchCounts[tier] += 1;
					batchTotal += 1;
				}
				for (const batch of batches) {
					if (batch.isRecalled) recalledBatches += 1;
				}
				itemCounts[worstExpiryTier(tiers)] += 1;
				if (row.product.isRecalled) recalledItems += 1;
				if (row.product.status === ProductStatus.INACTIVE) inactiveItems += 1;
			}
			if (rows.length < pageSize) break;
		}
		return {
			generatedAt: now,
			tiers: [...EXPIRY_TIERS],
			thresholdDays: {
				critical: EXPIRY_TIER_DAYS.CRITICAL,
				warning: EXPIRY_TIER_DAYS.WARNING,
				notice: EXPIRY_TIER_DAYS.NOTICE,
			},
			batches: { total: batchTotal, byTier: batchCounts },
			items: { total: itemTotal, byTier: itemCounts },
			recalledBatches,
			recalledItems,
			inactiveItems,
		};
	}
	/** In-warehouse batches that still hold stock, earliest expiry first (FEFO). */
	private liveBatches<
		T extends {
			tenantId: string;
			warehouseId: string;
			qtyOnHand: Prisma.Decimal;
		},
	>(batches: T[], warehouseId: string, tenantId: string): T[] {
		return batches.filter(
			(batch) =>
				batch.tenantId === tenantId &&
				batch.warehouseId === warehouseId &&
				Number(batch.qtyOnHand) > 0,
		);
	}
	private toItem(
		row: {
			productId: string;
			warehouseId: string;
			qty: Prisma.Decimal;
			avgCost: bigint;
			updatedAt: Date;
			product: {
				name: string;
				sku: string;
				baseUnitId: string;
				baseUnit: { name: string };
				batches: Array<{
					id: string;
					tenantId: string;
					batchCode: string;
					expiresAt: Date | null;
					qtyOnHand: Prisma.Decimal;
					warehouseId: string;
					healthState: string;
					version: number;
				}>;
			};
		},
		now: Date,
		tenantId: string,
	) {
		const batches = this.liveBatches(
			row.product.batches,
			row.warehouseId,
			tenantId,
		).sort(
			(a, b) =>
				(a.expiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER) -
				(b.expiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER),
		);
		const tiers = batches.map((batch) => classifyExpiry(batch.expiresAt, now));
		return {
			productId: row.productId,
			productName: row.product.name,
			sku: row.product.sku,
			warehouseId: row.warehouseId,
			baseUnitId: row.product.baseUnitId,
			baseUnit: row.product.baseUnit.name,
			qty: row.qty.toString(),
			avgCost: row.avgCost.toString(),
			updatedAt: row.updatedAt,
			nextExpiry: batches[0]?.expiresAt ?? null,
			/** Worst tier across this product's live batches (catalog §5.1). */
			expiryTier: worstExpiryTier(tiers),
			batches: batches.map((batch, index) => ({
				id: batch.id,
				batchCode: batch.batchCode,
				expiresAt: batch.expiresAt,
				expiryTier: tiers[index],
				daysToExpiry: daysToExpiry(batch.expiresAt, now),
				qtyOnHand: batch.qtyOnHand.toString(),
				healthState: batch.healthState,
				version: batch.version,
			})),
		};
	}
}
