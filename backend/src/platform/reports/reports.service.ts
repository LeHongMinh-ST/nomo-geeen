import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
	constructor(private readonly prisma: PrismaService) {}

	async stockSummary(tenantId: string) {
		const stocks = await this.prisma.stock.findMany({
			where: { tenantId },
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
		const batches = await this.prisma.productBatch.findMany({
			where: { tenantId, qtyOnHand: { gt: 0 } },
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
		return {
			items: stocks.map((stock) => ({
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
			})),
		};
	}

	async salesSummary(tenantId: string, query: { from?: string; to?: string }) {
		const { from, to } = this.range(query);
		const where: Prisma.SaleWhereInput = {
			tenantId,
			status: 'COMPLETED',
			deletedAt: null,
			soldAt: { gte: from, lt: to },
		};
		const aggregate = await this.prisma.sale.aggregate({
			where,
			_count: { _all: true },
			_sum: { total: true, amountPaid: true, debtAmount: true },
		});
		const lines = await this.prisma.saleLine.findMany({
			where: { tenantId, sale: where },
			select: {
				productId: true,
				productNameSnapshot: true,
				qtyBase: true,
				lineTotal: true,
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
		}
		return {
			from,
			to,
			orders: aggregate._count._all,
			total: (aggregate._sum.total ?? 0n).toString(),
			amountPaid: (aggregate._sum.amountPaid ?? 0n).toString(),
			debtAmount: (aggregate._sum.debtAmount ?? 0n).toString(),
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
