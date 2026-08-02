import { BadRequestException, Injectable } from '@nestjs/common';
import { BusinessGroup, Prisma, ProductStatus } from '@prisma/client';
import { classifyExpiry, worstExpiryTier } from '../inventory/expiry-policy';
import { PrismaService } from '../prisma/prisma.service';
import { BUSINESS_GROUP_CATALOG } from '../products/product-contract';

type GroupBucket = {
	businessGroup: BusinessGroup | 'UNGROUPED';
	label: string;
	itemCount: number;
	qty: Prisma.Decimal;
	total: bigint;
};

/** Matches inventory-card low-stock heuristic when settings omit a threshold. */
const DEFAULT_LOW_STOCK_THRESHOLD = 10;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const VN_TZ = 'Asia/Ho_Chi_Minh';

@Injectable()
export class ReportsService {
	constructor(private readonly prisma: PrismaService) {}

	/**
	 * Tenant home dashboard — one payload for KPIs, alerts, 7-day series, top sellers.
	 * Completes COMPLETED sales only (same filter as salesSummary); no advanced_mode gate.
	 */
	async homeSummary(tenantId: string, now = new Date()) {
		const today = this.vnDayBounds(now);
		const yesterdayStart = new Date(today.start.getTime() - MS_PER_DAY);
		const weekStart = new Date(today.start.getTime() - 6 * MS_PER_DAY);
		const month = this.vnMonthBounds(today.start);
		const prevMonth = this.vnMonthBounds(
			new Date(month.start.getTime() - MS_PER_DAY),
		);

		const completed = {
			tenantId,
			status: 'COMPLETED' as const,
			deletedAt: null,
		};

		const [
			todayAgg,
			yesterdayAgg,
			monthAgg,
			prevMonthAgg,
			weekSales,
			monthLines,
			receivable,
			settings,
			stocks,
		] = await Promise.all([
			this.prisma.sale.aggregate({
				where: { ...completed, soldAt: { gte: today.start, lt: today.end } },
				_count: { _all: true },
				_sum: { total: true },
			}),
			this.prisma.sale.aggregate({
				where: {
					...completed,
					soldAt: { gte: yesterdayStart, lt: today.start },
				},
				_count: { _all: true },
				_sum: { total: true },
			}),
			this.prisma.sale.aggregate({
				where: { ...completed, soldAt: { gte: month.start, lt: month.end } },
				_count: { _all: true },
				_sum: { total: true },
			}),
			this.prisma.sale.aggregate({
				where: {
					...completed,
					soldAt: { gte: prevMonth.start, lt: prevMonth.end },
				},
				_count: { _all: true },
				_sum: { total: true },
			}),
			this.prisma.sale.findMany({
				where: {
					...completed,
					soldAt: { gte: weekStart, lt: today.end },
				},
				select: { soldAt: true, total: true },
			}),
			this.prisma.saleLine.findMany({
				where: {
					tenantId,
					sale: {
						...completed,
						soldAt: { gte: month.start, lt: month.end },
					},
				},
				select: {
					productId: true,
					productNameSnapshot: true,
					qtyBase: true,
					lineTotal: true,
				},
			}),
			this.prisma.customer.aggregate({
				where: { tenantId, deletedAt: null, balance: { gt: 0n } },
				_count: { _all: true },
				_sum: { balance: true },
			}),
			this.prisma.tenantSettings.findUnique({
				where: { tenantId },
				select: { lowStockThresholdDefault: true },
			}),
			this.prisma.stock.findMany({
				where: { tenantId },
				select: {
					qty: true,
					warehouseId: true,
					product: {
						select: {
							status: true,
							batches: {
								where: { tenantId, qtyOnHand: { gt: 0 } },
								select: {
									tenantId: true,
									warehouseId: true,
									expiresAt: true,
									qtyOnHand: true,
								},
							},
						},
					},
				},
			}),
		]);

		const threshold = settings?.lowStockThresholdDefault
			? Number(settings.lowStockThresholdDefault)
			: DEFAULT_LOW_STOCK_THRESHOLD;
		const safeThreshold =
			Number.isFinite(threshold) && threshold > 0
				? threshold
				: DEFAULT_LOW_STOCK_THRESHOLD;

		let lowStock = 0;
		let nearExpiry = 0;
		for (const row of stocks) {
			const qty = Number(row.qty);
			if (
				row.product.status === ProductStatus.ACTIVE &&
				qty > 0 &&
				qty <= safeThreshold
			) {
				lowStock += 1;
			}
			const live = row.product.batches.filter(
				(b) =>
					b.tenantId === tenantId &&
					b.warehouseId === row.warehouseId &&
					Number(b.qtyOnHand) > 0,
			);
			const tiers = live.map((b) => classifyExpiry(b.expiresAt, now));
			const worst = worstExpiryTier(tiers);
			if (worst === 'EXPIRED' || worst === 'CRITICAL' || worst === 'WARNING') {
				nearExpiry += 1;
			}
		}

		const dayBuckets = new Map<string, bigint>();
		for (let i = 0; i < 7; i += 1) {
			const day = new Date(weekStart.getTime() + i * MS_PER_DAY);
			dayBuckets.set(this.vnDateKey(day), 0n);
		}
		for (const sale of weekSales) {
			const key = this.vnDateKey(sale.soldAt);
			if (!dayBuckets.has(key)) continue;
			dayBuckets.set(key, (dayBuckets.get(key) ?? 0n) + BigInt(sale.total));
		}
		const last7Days = [...dayBuckets.entries()].map(([date, revenue]) => ({
			date,
			label: this.vnWeekdayLabel(date),
			revenue: revenue.toString(),
		}));

		const top = new Map<
			string,
			{
				productId: string;
				name: string;
				qtyBase: Prisma.Decimal;
				total: bigint;
			}
		>();
		for (const line of monthLines) {
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
		const topProducts = [...top.values()]
			.sort((a, b) => (b.total > a.total ? 1 : b.total < a.total ? -1 : 0))
			.slice(0, 4)
			.map((product) => ({
				productId: product.productId,
				name: product.name,
				qtyBase: product.qtyBase.toString(),
				total: product.total.toString(),
			}));

		const money = (value: bigint | null | undefined) =>
			(value ?? 0n).toString();

		return {
			generatedAt: now.toISOString(),
			timezone: VN_TZ,
			today: {
				revenue: money(todayAgg._sum.total),
				orders: todayAgg._count._all,
				previousRevenue: money(yesterdayAgg._sum.total),
				previousOrders: yesterdayAgg._count._all,
			},
			month: {
				revenue: money(monthAgg._sum.total),
				orders: monthAgg._count._all,
				previousRevenue: money(prevMonthAgg._sum.total),
				previousOrders: prevMonthAgg._count._all,
			},
			receivable: {
				balance: money(receivable._sum.balance),
				customers: receivable._count._all,
			},
			alerts: {
				lowStock,
				debtOwing: receivable._count._all,
				nearExpiry,
				lowStockThreshold: safeThreshold,
			},
			last7Days,
			topProducts,
		};
	}

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

	/**
	 * Sổ xuất nhập theo lô — mọi lần nhập/xuất trong khoảng ngày, kèm mã lô, hạn
	 * dùng và số đăng ký lưu thông để đối chiếu khi cơ quan kiểm tra.
	 */
	async batchLedger(
		tenantId: string,
		query: { from?: string; to?: string; productId?: string },
	) {
		const { from, to } = this.range(query);
		const movements = await this.prisma.stockMovement.findMany({
			where: {
				tenantId,
				occurredAt: { gte: from, lt: to },
				...(query.productId ? { productId: query.productId } : {}),
			},
			orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
			take: 1000,
			select: {
				id: true,
				occurredAt: true,
				direction: true,
				qty: true,
				unitCost: true,
				reason: true,
				refType: true,
				refId: true,
				warehouseId: true,
				product: {
					select: {
						id: true,
						sku: true,
						name: true,
						productKind: true,
						registrationNo: true,
					},
				},
				batch: {
					select: { id: true, batchCode: true, expiresAt: true },
				},
			},
		});
		let inbound = new Prisma.Decimal(0);
		let outbound = new Prisma.Decimal(0);
		for (const movement of movements) {
			if (movement.direction === 'IN') inbound = inbound.add(movement.qty);
			else outbound = outbound.add(movement.qty);
		}
		return {
			from,
			to,
			filter: { productId: query.productId ?? null },
			totals: {
				movementCount: movements.length,
				inboundQty: inbound.toString(),
				outboundQty: outbound.toString(),
			},
			entries: movements.map((movement) => ({
				id: movement.id,
				occurredAt: movement.occurredAt,
				direction: movement.direction,
				qty: movement.qty.toString(),
				unitCost: movement.unitCost?.toString() ?? null,
				reason: movement.reason,
				refType: movement.refType,
				refId: movement.refId,
				warehouseId: movement.warehouseId,
				product: movement.product,
				batchCode: movement.batch?.batchCode ?? null,
				batchExpiresAt: movement.batch?.expiresAt ?? null,
			})),
		};
	}

	/**
	 * Truy xuất theo số đăng ký lưu thông — sản phẩm mang số đăng ký đó, tồn theo
	 * lô và lượng đã bán trong khoảng ngày.
	 */
	async registrationTrace(
		tenantId: string,
		query: { registrationNo: string; from?: string; to?: string },
	) {
		const registrationNo = query.registrationNo.trim();
		if (!registrationNo)
			throw new BadRequestException({ reason: 'INVALID_REGISTRATION_NO' });
		const { from, to } = this.range(query);
		const products = await this.prisma.product.findMany({
			where: { tenantId, registrationNo, deletedAt: null },
			orderBy: [{ name: 'asc' }, { id: 'asc' }],
			select: {
				id: true,
				sku: true,
				name: true,
				productKind: true,
				registrationNo: true,
				requiresPrescription: true,
			},
		});
		const productIds = products.map((product) => product.id);
		if (productIds.length === 0)
			return { from, to, registrationNo, items: [] };
		const [batches, saleLines] = await Promise.all([
			this.prisma.productBatch.findMany({
				where: { tenantId, productId: { in: productIds } },
				orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
				select: {
					id: true,
					productId: true,
					batchCode: true,
					expiresAt: true,
					qtyOnHand: true,
					isRecalled: true,
				},
			}),
			this.prisma.saleLine.findMany({
				where: {
					tenantId,
					productId: { in: productIds },
					sale: {
						tenantId,
						status: 'COMPLETED',
						deletedAt: null,
						soldAt: { gte: from, lt: to },
					},
				},
				select: {
					productId: true,
					qtyBase: true,
					lineTotal: true,
					sale: {
						select: {
							id: true,
							docNo: true,
							soldAt: true,
							customerId: true,
						},
					},
				},
			}),
		]);
		return {
			from,
			to,
			registrationNo,
			items: products.map((product) => {
				const sold = saleLines.filter(
					(line) => line.productId === product.id,
				);
				return {
					product,
					batches: batches
						.filter((batch) => batch.productId === product.id)
						.map((batch) => ({
							...batch,
							qtyOnHand: batch.qtyOnHand.toString(),
						})),
					soldQtyBase: sold
						.reduce(
							(sum, line) => sum.add(line.qtyBase),
							new Prisma.Decimal(0),
						)
						.toString(),
					sales: sold.map((line) => ({
						saleId: line.sale.id,
						docNo: line.sale.docNo,
						soldAt: line.sale.soldAt,
						customerId: line.sale.customerId,
						qtyBase: line.qtyBase.toString(),
						lineTotal: line.lineTotal.toString(),
					})),
				};
			}),
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

	/** Calendar date key in Asia/Ho_Chi_Minh (no DST). */
	private vnDateKey(value: Date): string {
		return new Intl.DateTimeFormat('en-CA', {
			timeZone: VN_TZ,
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
		}).format(value);
	}

	private vnDayBounds(now: Date): { start: Date; end: Date; date: string } {
		const date = this.vnDateKey(now);
		const start = new Date(`${date}T00:00:00+07:00`);
		const end = new Date(start.getTime() + MS_PER_DAY);
		return { start, end, date };
	}

	private vnMonthBounds(dayInMonth: Date): { start: Date; end: Date } {
		const key = this.vnDateKey(dayInMonth);
		const [y, m] = key.split('-').map(Number);
		const start = new Date(
			`${y}-${String(m).padStart(2, '0')}-01T00:00:00+07:00`,
		);
		const endMonth = m === 12 ? 1 : m + 1;
		const endYear = m === 12 ? y + 1 : y;
		const end = new Date(
			`${endYear}-${String(endMonth).padStart(2, '0')}-01T00:00:00+07:00`,
		);
		return { start, end };
	}

	private vnWeekdayLabel(dateKey: string): string {
		const day = new Date(`${dateKey}T12:00:00+07:00`);
		const labels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
		return labels[day.getUTCDay()] ?? dateKey;
	}
}
