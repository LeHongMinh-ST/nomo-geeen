import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
									batchCode: true,
									expiresAt: true,
									qtyOnHand: true,
									warehouseId: true,
								},
							},
						},
					},
				},
			}),
			this.prisma.stock.count({ where }),
		]);
		return {
			items: rows.map((row) => this.toItem(row)),
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
								batchCode: true,
								expiresAt: true,
								qtyOnHand: true,
								warehouseId: true,
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
			...this.toItem(row),
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
	private toItem(row: {
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
				batchCode: string;
				expiresAt: Date | null;
				qtyOnHand: Prisma.Decimal;
				warehouseId: string;
			}>;
		};
	}) {
		const batches = row.product.batches
			.filter(
				(batch) =>
					batch.warehouseId === row.warehouseId && Number(batch.qtyOnHand) > 0,
			)
			.sort(
				(a, b) =>
					(a.expiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER) -
					(b.expiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER),
			);
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
			batches: batches.map((batch) => ({
				id: batch.id,
				batchCode: batch.batchCode,
				expiresAt: batch.expiresAt,
				qtyOnHand: batch.qtyOnHand.toString(),
			})),
		};
	}
}
