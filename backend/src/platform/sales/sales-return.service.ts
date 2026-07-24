import { randomUUID } from 'node:crypto';
import {
	ConflictException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import {
	AuditAction,
	AuditActorType,
	Prisma,
	StockDirection,
	StockReason,
} from '@prisma/client';
import { AuditLogger } from '../audit/audit-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePartialSalesReturnDto } from './dto/create-partial-sales-return.dto';
import {
	addQty,
	decimalToNumber,
	proRataDebt,
	qtyKey,
	remainingQty,
	resolveSettlementMode,
} from './returnable-qty';

type Tx = Prisma.TransactionClient;

@Injectable()
export class SalesReturnsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditLogger,
	) {}

	async createFullReturn(
		tenantId: string,
		userId: string,
		saleId: string,
		note?: string,
	) {
		return this.prisma.$transaction(
			(tx) => this.createFullInTransaction(tx, tenantId, userId, saleId, note),
			{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
		);
	}

	async createPartialReturn(
		tenantId: string,
		userId: string,
		saleId: string,
		dto: CreatePartialSalesReturnDto,
	) {
		try {
			return await this.prisma.$transaction(
				(tx) =>
					this.createPartialInTransaction(tx, tenantId, userId, saleId, dto),
				{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
			);
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === 'P2002' &&
				dto.idempotencyKey
			) {
				const existing = await this.prisma.salesReturn.findFirst({
					where: { tenantId, idempotencyKey: dto.idempotencyKey },
					include: { lines: true },
				});
				if (existing) return existing;
			}
			throw error;
		}
	}

	private async createFullInTransaction(
		tx: Tx,
		tenantId: string,
		userId: string,
		saleId: string,
		note?: string,
	) {
		const sale = await tx.sale.findFirst({
			where: { id: saleId, tenantId, deletedAt: null },
			include: { lines: { include: { batches: true } } },
		});
		if (!sale) throw new NotFoundException('Sale not found');
		if (sale.status !== 'COMPLETED')
			throw new ConflictException({ reason: 'SALE_NOT_RETURNABLE' });

		const existing = await tx.salesReturn.findFirst({
			where: { tenantId, originalSaleId: sale.id, status: 'COMPLETED' },
			select: { id: true },
		});
		if (existing)
			throw new ConflictException({ reason: 'SALE_ALREADY_RETURNED' });

		const returnDoc = await tx.salesReturn.create({
			data: {
				tenantId,
				docNo: `RT-${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`,
				originalSaleId: sale.id,
				customerId: sale.customerId,
				warehouseId: sale.warehouseId,
				status: 'COMPLETED',
				total: sale.total,
				note: note?.trim() || null,
				createdBy: userId,
				completedAt: new Date(),
				lines: {
					create: sale.lines.map((line) => ({
						saleLineId: line.id,
						productId: line.productId,
						qtyBase: line.qtyBase,
						lineTotal: line.lineTotal,
					})),
				},
			},
		});

		for (const line of sale.lines) {
			await this.restoreStockLine(
				tx,
				tenantId,
				userId,
				sale.warehouseId,
				returnDoc.id,
				line.productId,
				line.qtyBase,
				line.batches.map((b) => ({
					batchId: b.batchId,
					qtyBase: b.qtyBase,
				})),
			);
		}

		const debtAdjust = await this.applyDebtAdjust(
			tx,
			tenantId,
			userId,
			sale.customerId,
			sale.debtAmount,
			returnDoc.id,
		);

		const completed = await tx.salesReturn.update({
			where: { id: returnDoc.id },
			data: { debtAdjust },
			include: { lines: true },
		});
		await this.audit.writeInTx(tx, {
			tenantId,
			actorId: userId,
			actorType: AuditActorType.USER,
			actorRoleCode: null,
			action: AuditAction.SALE_RETURN,
			resource: 'sales_return',
			resourceId: completed.id,
			after: {
				originalSaleId: sale.id,
				mode: 'FULL',
				total: completed.total.toString(),
				debtAdjust: completed.debtAdjust.toString(),
			},
		});
		return completed;
	}

	private async createPartialInTransaction(
		tx: Tx,
		tenantId: string,
		userId: string,
		saleId: string,
		dto: CreatePartialSalesReturnDto,
	) {
		if (dto.idempotencyKey) {
			const prior = await tx.salesReturn.findFirst({
				where: { tenantId, idempotencyKey: dto.idempotencyKey },
				include: { lines: true },
			});
			if (prior) return prior;
		}

		const sale = await tx.sale.findFirst({
			where: { id: saleId, tenantId, deletedAt: null },
			include: { lines: { include: { batches: true } } },
		});
		if (!sale) throw new NotFoundException('Sale not found');
		if (sale.status !== 'COMPLETED')
			throw new ConflictException({ reason: 'SALE_NOT_RETURNABLE' });

		const mode = resolveSettlementMode(dto.settlementMode, sale.debtAmount);
		if (mode === 'REFUND_VOUCHER') {
			throw new ConflictException({ reason: 'SETTLEMENT_NOT_SUPPORTED' });
		}

		const priorReturns = await tx.salesReturn.findMany({
			where: { tenantId, originalSaleId: sale.id, status: 'COMPLETED' },
			include: { lines: true },
		});
		const returnedMap = new Map<string, number>();
		for (const ret of priorReturns) {
			for (const rl of ret.lines) {
				if (!rl.saleLineId) continue;
				addQty(returnedMap, rl.saleLineId, rl.batchId, rl.qtyBase);
			}
		}

		const saleLineById = new Map(sale.lines.map((l) => [l.id, l]));
		const requestAgg = new Map<
			string,
			{ saleLineId: string; batchId: string | null; qty: number }
		>();
		for (const req of dto.lines) {
			const qty = decimalToNumber(req.qtyBase);
			if (!(qty > 0)) {
				throw new ConflictException({ reason: 'RETURN_QTY_EXCEEDS_REMAINING' });
			}
			const key = qtyKey(req.saleLineId, req.batchId ?? null);
			const cur = requestAgg.get(key);
			if (cur) cur.qty += qty;
			else
				requestAgg.set(key, {
					saleLineId: req.saleLineId,
					batchId: req.batchId ?? null,
					qty,
				});
		}

		type Planned = {
			saleLineId: string;
			productId: string;
			batchId: string | null;
			qtyBase: Prisma.Decimal;
			lineTotal: bigint;
		};
		const planned: Planned[] = [];
		let returnedMoney = 0n;

		for (const item of requestAgg.values()) {
			const line = saleLineById.get(item.saleLineId);
			if (!line) {
				throw new ConflictException({ reason: 'SALE_NOT_RETURNABLE' });
			}

			if (item.batchId) {
				const alloc = line.batches.find((b) => b.batchId === item.batchId);
				if (!alloc) {
					throw new ConflictException({ reason: 'BATCH_RETURN_CONFLICT' });
				}
				const orig = decimalToNumber(alloc.qtyBase);
				const already = returnedMap.get(qtyKey(line.id, item.batchId)) ?? 0;
				const rem = remainingQty(orig, already);
				if (item.qty > rem + 1e-9) {
					throw new ConflictException({
						reason: 'RETURN_QTY_EXCEEDS_REMAINING',
					});
				}
				if (rem <= 0 && item.qty > 0) {
					throw new ConflictException({ reason: 'SALE_ALREADY_RETURNED' });
				}
			} else {
				if (line.batches.length > 0) {
					throw new ConflictException({ reason: 'BATCH_RETURN_CONFLICT' });
				}
				const orig = decimalToNumber(line.qtyBase);
				const already = returnedMap.get(qtyKey(line.id, null)) ?? 0;
				const rem = remainingQty(orig, already);
				if (item.qty > rem + 1e-9) {
					throw new ConflictException({
						reason: 'RETURN_QTY_EXCEEDS_REMAINING',
					});
				}
				if (rem <= 0 && item.qty > 0) {
					throw new ConflictException({ reason: 'SALE_ALREADY_RETURNED' });
				}
			}

			const lineQty = decimalToNumber(line.qtyBase);
			const share =
				lineQty > 0
					? BigInt(Math.floor((Number(line.lineTotal) * item.qty) / lineQty))
					: 0n;
			returnedMoney += share;
			planned.push({
				saleLineId: line.id,
				productId: line.productId,
				batchId: item.batchId,
				qtyBase: new Prisma.Decimal(item.qty),
				lineTotal: share,
			});
		}

		if (planned.length === 0) {
			throw new ConflictException({ reason: 'RETURN_QTY_EXCEEDS_REMAINING' });
		}

		const allRemainingZero = sale.lines.every((line) => {
			if (line.batches.length === 0) {
				const rem = remainingQty(
					decimalToNumber(line.qtyBase),
					returnedMap.get(qtyKey(line.id, null)) ?? 0,
				);
				return rem <= 0;
			}
			return line.batches.every((b) => {
				const rem = remainingQty(
					decimalToNumber(b.qtyBase),
					returnedMap.get(qtyKey(line.id, b.batchId)) ?? 0,
				);
				return rem <= 0;
			});
		});
		if (allRemainingZero) {
			throw new ConflictException({ reason: 'SALE_ALREADY_RETURNED' });
		}

		const returnTotal = returnedMoney;
		const returnDoc = await tx.salesReturn.create({
			data: {
				tenantId,
				docNo: `RT-${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`,
				originalSaleId: sale.id,
				customerId: sale.customerId,
				warehouseId: sale.warehouseId,
				status: 'COMPLETED',
				total: returnTotal,
				note: dto.note?.trim() || null,
				idempotencyKey: dto.idempotencyKey?.trim() || null,
				createdBy: userId,
				completedAt: new Date(),
				lines: {
					create: planned.map((p) => ({
						saleLineId: p.saleLineId,
						productId: p.productId,
						batchId: p.batchId,
						qtyBase: p.qtyBase,
						lineTotal: p.lineTotal,
					})),
				},
			},
		});

		const byProduct = new Map<
			string,
			{
				productId: string;
				qty: Prisma.Decimal;
				batches: { batchId: string; qtyBase: Prisma.Decimal }[];
			}
		>();
		for (const p of planned) {
			const cur = byProduct.get(p.productId) ?? {
				productId: p.productId,
				qty: new Prisma.Decimal(0),
				batches: [] as { batchId: string; qtyBase: Prisma.Decimal }[],
			};
			cur.qty = cur.qty.add(p.qtyBase);
			if (p.batchId) {
				cur.batches.push({ batchId: p.batchId, qtyBase: p.qtyBase });
			}
			byProduct.set(p.productId, cur);
		}
		for (const group of byProduct.values()) {
			await this.restoreStockLine(
				tx,
				tenantId,
				userId,
				sale.warehouseId,
				returnDoc.id,
				group.productId,
				group.qty,
				group.batches,
			);
		}

		let debtTarget = 0n;
		if (mode === 'DEBT_ADJUST_ONLY' && sale.debtAmount > 0n) {
			const share = proRataDebt(sale.debtAmount, returnTotal, sale.total);
			if (dto.debtAdjust !== undefined && dto.debtAdjust !== null) {
				const requested = BigInt(dto.debtAdjust);
				if (requested < 0n || requested > share) {
					throw new ConflictException({ reason: 'DEBT_RETURN_CONFLICT' });
				}
				debtTarget = requested;
			} else {
				debtTarget = share;
			}
		} else if (
			dto.debtAdjust &&
			BigInt(dto.debtAdjust) > 0n &&
			mode === 'NONE'
		) {
			throw new ConflictException({ reason: 'SETTLEMENT_REQUIRED' });
		}

		const debtAdjust = await this.applyDebtAdjust(
			tx,
			tenantId,
			userId,
			sale.customerId,
			debtTarget,
			returnDoc.id,
		);

		const completed = await tx.salesReturn.update({
			where: { id: returnDoc.id },
			data: { debtAdjust },
			include: { lines: true },
		});
		await this.audit.writeInTx(tx, {
			tenantId,
			actorId: userId,
			actorType: AuditActorType.USER,
			actorRoleCode: null,
			action: AuditAction.SALE_RETURN,
			resource: 'sales_return',
			resourceId: completed.id,
			after: {
				originalSaleId: sale.id,
				mode: 'PARTIAL',
				total: completed.total.toString(),
				debtAdjust: completed.debtAdjust.toString(),
			},
		});
		return completed;
	}

	private async restoreStockLine(
		tx: Tx,
		tenantId: string,
		userId: string,
		warehouseId: string,
		returnId: string,
		productId: string,
		qtyBase: Prisma.Decimal,
		batches: { batchId: string; qtyBase: Prisma.Decimal }[],
	) {
		const stock = await tx.stock.updateMany({
			where: { tenantId, warehouseId, productId },
			data: { qty: { increment: qtyBase } },
		});
		if (stock.count !== 1)
			throw new ConflictException({ reason: 'STOCK_RETURN_CONFLICT' });

		if (batches.length > 0) {
			for (const allocation of batches) {
				const current = await tx.productBatch.findFirst({
					where: { id: allocation.batchId, tenantId },
					select: { id: true, version: true, healthState: true },
				});
				if (!current)
					throw new ConflictException({ reason: 'BATCH_RETURN_CONFLICT' });
				const batch = await tx.productBatch.updateMany({
					where: {
						id: current.id,
						tenantId,
						version: current.version,
					},
					data: {
						qtyOnHand: { increment: allocation.qtyBase },
						version: { increment: 1 },
					},
				});
				if (batch.count !== 1)
					throw new ConflictException({ reason: 'BATCH_RETURN_CONFLICT' });
				await tx.stockMovement.create({
					data: {
						tenantId,
						warehouseId,
						productId,
						batchId: allocation.batchId,
						direction: StockDirection.IN,
						qty: allocation.qtyBase,
						reason: StockReason.SALE_RETURN,
						refType: 'SALE_RETURN',
						refId: returnId,
						createdBy: userId,
					},
				});
			}
		} else {
			await tx.stockMovement.create({
				data: {
					tenantId,
					warehouseId,
					productId,
					direction: StockDirection.IN,
					qty: qtyBase,
					reason: StockReason.SALE_RETURN,
					refType: 'SALE_RETURN',
					refId: returnId,
					createdBy: userId,
				},
			});
		}
	}

	private async applyDebtAdjust(
		tx: Tx,
		tenantId: string,
		userId: string,
		customerId: string | null,
		amount: bigint,
		returnId: string,
	): Promise<bigint> {
		if (amount <= 0n) return 0n;
		if (!customerId)
			throw new ConflictException({ reason: 'DEBT_RETURN_CONFLICT' });
		const updated = await tx.customer.updateMany({
			where: {
				id: customerId,
				tenantId,
				deletedAt: null,
				balance: { gte: amount },
			},
			data: { balance: { decrement: amount } },
		});
		if (updated.count !== 1)
			throw new ConflictException({ reason: 'DEBT_RETURN_CONFLICT' });
		const customer = await tx.customer.findFirstOrThrow({
			where: { id: customerId, tenantId, deletedAt: null },
			select: { balance: true },
		});
		await tx.debtLedger.create({
			data: {
				tenantId,
				partyType: 'CUSTOMER',
				partyId: customerId,
				entryType: 'ADJUST',
				direction: 'DECREASE',
				amount,
				balanceAfter: customer.balance,
				refType: 'SALE_RETURN',
				refId: returnId,
				createdBy: userId,
			},
		});
		return amount;
	}
}
