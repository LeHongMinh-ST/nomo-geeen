import { BadRequestException, Injectable } from '@nestjs/common';
import { BusinessGroup, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BUSINESS_GROUP_CATALOG } from '../products/product-contract';

type GroupBucket = {
	businessGroup: BusinessGroup | 'UNGROUPED';
	label: string;
	itemCount: number;
	qty: Prisma.Decimal;
	total: bigint;
};

@Injectable()
export class ReportsService {
	constructor(private readonly prisma: PrismaService) {}

	async stockSummary(
		tenantId: string,
		query: { businessGroup?: BusinessGroup } = {},
	) {
		const groupFilter = this.groupFilter(query.businessGroup);
		const stocks = await this.prisma.stock.findMany({
			where: {
				tenantId,
				...(groupFilter ? { product: { businessGroup: groupFilter } } : {}),
			},
			orderBy: [{ qty: 'desc' }, { productId: 'asc' }],
			include: {
				product: {
					select: {
						id: true,
						sku: true,
						name: true,
						productKind: true,
						businessGroup: true,
						baseUnitId: true,
					},
				},
			},
		});
		const productIds = stocks.map((s) => s.productId);
		const batches =
			productIds.length === 0
				? []
				: await this.prisma.productBatch.findMany({
						where: {
							tenantId,
							qtyOnHand: { gt: 0 },
							productId: { in: productIds },
						},
						orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
						select: {
							id: true,
							productId: true,
							warehouseId: true,
							batchCode: true,
							expiresAt: true,
							qtyOnHand: true,
							isRecalled: true,
						},
					});
		const byProduct = new Map<string, typeof batches>();
		for (const batch of batches)
			byProduct.set(batch.productId, [
				...(byProduct.get(batch.productId) ?? []),
				batch,
			]);

		const items = stocks.map((stock) => ({
			warehouseId: stock.warehouseId,
			product: stock.product,
			qty: stock.qty.toString(),
			avgCost: stock.avgCost.toString(),
			batches: (
				byProduct
					.get(stock.productId)
					?.filter((batch) => batch.warehouseId === stock.warehouseId) ?? []
			).map((batch) => ({
				...batch,
				qtyOnHand: batch.qtyOnHand.toString(),
			})),
		}));

		const buckets = new Map<string, GroupBucket>();
		for (const stock of stocks) {
			const key = stock.product.businessGroup ?? 'UNGROUPED';
			const current = buckets.get(key) ?? {
				businessGroup: key as BusinessGroup | 'UNGROUPED',
				label: this.groupLabel(stock.product.businessGroup),
				itemCount: 0,
				qty: new Prisma.Decimal(0),
				total: 0n,
			};
			current.itemCount += 1;
			current.qty = current.qty.add(stock.qty);
			buckets.set(key, current);
		}

		return {
			filter: { businessGroup: query.businessGroup ?? null },
			byBusinessGroup: this.orderedGroups(buckets).map((b) => ({
				businessGroup: b.businessGroup,
				label: b.label,
				itemCount: b.itemCount,
				qty: b.qty.toString(),
			})),
			items,
		};
	}

	async salesSummary(
		tenantId: string,
		query: { from?: string; to?: string; businessGroup?: BusinessGroup },
	) {
		const { from, to } = this.range(query);
		const groupFilter = this.groupFilter(query.businessGroup);
		const where: Prisma.SaleWhereInput = {
			tenantId,
			status: 'COMPLETED',
			deletedAt: null,
			soldAt: { gte: from, lt: to },
			...(groupFilter
				? { lines: { some: { product: { businessGroup: groupFilter } } } }
				: {}),
		};
		const lineWhere: Prisma.SaleLineWhereInput = {
			tenantId,
			sale: {
				tenantId,
				status: 'COMPLETED',
				deletedAt: null,
				soldAt: { gte: from, lt: to },
			},
			...(groupFilter ? { product: { businessGroup: groupFilter } } : {}),
		};

		const aggregate = await this.prisma.sale.aggregate({
			where,
			_count: { _all: true },
			_sum: { total: true, amountPaid: true, debtAmount: true },
		});
		const lines = await this.prisma.saleLine.findMany({
			where: lineWhere,
			select: {
				productId: true,
				productNameSnapshot: true,
				qtyBase: true,
				lineTotal: true,
				product: { select: { businessGroup: true } },
			},
		});
		const top = new Map<
			string,
			{
				productId: string;
				name: string;
				qtyBase: Prisma.Decimal;
				total: bigint;
			}
		>();
		const buckets = new Map<string, GroupBucket>();
		for (const line of lines) {
			const current = top.get(line.productId) ?? {
				productId: line.productId,
				name: line.productNameSnapshot,
				qtyBase: new Prisma.Decimal(0),
				total: 0n,
			};
			current.qtyBase = current.qtyBase.add(line.qtyBase);
			current.total += BigInt(line.lineTotal);
			top.set(line.productId, current);

			const key = line.product.businessGroup ?? 'UNGROUPED';
			const bucket = buckets.get(key) ?? {
				businessGroup: key as BusinessGroup | 'UNGROUPED',
				label: this.groupLabel(line.product.businessGroup),
				itemCount: 0,
				qty: new Prisma.Decimal(0),
				total: 0n,
			};
			bucket.itemCount += 1;
			bucket.qty = bucket.qty.add(line.qtyBase);
			bucket.total += BigInt(line.lineTotal);
			buckets.set(key, bucket);
		}
		return {
			from,
			to,
			filter: { businessGroup: query.businessGroup ?? null },
			orders: aggregate._count._all,
			total: (aggregate._sum.total ?? 0n).toString(),
			amountPaid: (aggregate._sum.amountPaid ?? 0n).toString(),
			debtAmount: (aggregate._sum.debtAmount ?? 0n).toString(),
			byBusinessGroup: this.orderedGroups(buckets).map((b) => ({
				businessGroup: b.businessGroup,
				label: b.label,
				lineCount: b.itemCount,
				qtyBase: b.qty.toString(),
				total: b.total.toString(),
			})),
			topProducts: [...top.values()]
				.sort((a, b) => (b.total > a.total ? 1 : b.total < a.total ? -1 : 0))
				.slice(0, 10)
				.map((product) => ({
					...product,
					qtyBase: product.qtyBase.toString(),
					total: product.total.toString(),
				})),
		};
	}

	private groupFilter(value?: BusinessGroup): BusinessGroup | undefined {
		if (value === undefined) return undefined;
		if (!BUSINESS_GROUP_CATALOG.some((g) => g.id === value)) {
			throw new BadRequestException({ reason: 'INVALID_BUSINESS_GROUP' });
		}
		return value;
	}

	private groupLabel(group: BusinessGroup | null | undefined): string {
		if (!group) return 'Chưa gán nhóm';
		return BUSINESS_GROUP_CATALOG.find((g) => g.id === group)?.label ?? group;
	}

	private orderedGroups(buckets: Map<string, GroupBucket>): GroupBucket[] {
		const order = [
			...BUSINESS_GROUP_CATALOG.map((g) => g.id as string),
			'UNGROUPED',
		];
		return [...buckets.values()].sort(
			(a, b) => order.indexOf(a.businessGroup) - order.indexOf(b.businessGroup),
		);
	}

	private range(query: { from?: string; to?: string }) {
		const to = query.to ? new Date(query.to) : new Date();
		const from = query.from
			? new Date(query.from)
			: new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
		if (
			Number.isNaN(from.getTime()) ||
			Number.isNaN(to.getTime()) ||
			from >= to
		)
			throw new BadRequestException({ reason: 'INVALID_REPORT_RANGE' });
		if (to.getTime() - from.getTime() > 366 * 24 * 60 * 60 * 1000)
			throw new BadRequestException({ reason: 'REPORT_RANGE_TOO_LARGE' });
		return { from, to };
	}
}
