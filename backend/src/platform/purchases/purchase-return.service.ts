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
import {
	parseRefundMethod,
	type RefundVoucherResult,
	resolveRefundAmount,
	resolveRefundCap,
	sumPriorRefunds,
	writeRefundVoucher,
} from '../sales/refund-settlement';
import {
	addQty,
	decimalToNumber,
	parseDebtAdjust,
	proRataDebt,
	qtyKey,
	remainingQty,
	resolveSettlementMode,
} from '../sales/returnable-qty';
import type { CreatePartialPurchaseReturnDto } from './dto/create-partial-purchase-return.dto';

type Tx = Prisma.TransactionClient;

@Injectable()
export class PurchaseReturnsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditLogger,
	) {}

	async createFullReturn(
		tenantId: string,
		userId: string,
		purchaseId: string,
		note?: string,
	) {
		return this.withSerializableRetry((tx) =>
			this.createFullInTransaction(tx, tenantId, userId, purchaseId, note),
		);
	}

	async createPartialReturn(
		tenantId: string,
		userId: string,
		purchaseId: string,
		dto: CreatePartialPurchaseReturnDto,
	) {
		try {
			return await this.withSerializableRetry((tx) =>
				this.createPartialInTransaction(tx, tenantId, userId, purchaseId, dto),
			);
		} catch (error) {
			if (
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === 'P2002' &&
				dto.idempotencyKey
			) {
				const existing = await this.prisma.purchaseReturn.findFirst({
					where: { tenantId, idempotencyKey: dto.idempotencyKey },
					include: { lines: true },
				});
				if (existing) return existing;
			}
			throw error;
		}
	}

	private async withSerializableRetry<T>(operation: (tx: Tx) => Promise<T>) {
		for (let attempt = 0; attempt < 3; attempt += 1) {
			try {
				return await this.prisma.$transaction(operation, {
					isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
				});
			} catch (error) {
				if (
					error instanceof ConflictException ||
					error instanceof NotFoundException
				) {
					throw error;
				}
				const retryable =
					error instanceof Prisma.PrismaClientKnownRequestError &&
					error.code === 'P2034';
				if (!retryable) throw error;
				if (attempt === 2)
					throw new ConflictException({ reason: 'SERIALIZATION_CONFLICT' });
			}
		}
		throw new ConflictException({ reason: 'SERIALIZATION_CONFLICT' });
	}

	private async createFullInTransaction(
		tx: Tx,
		tenantId: string,
		userId: string,
		purchaseId: string,
		note?: string,
	) {
		const purchase = await tx.purchase.findFirst({
			where: { id: purchaseId, tenantId, deletedAt: null },
			include: { lines: true },
		});
		if (!purchase) throw new NotFoundException('Purchase not found');
		if (purchase.status !== 'COMPLETED')
			throw new ConflictException({ reason: 'PURCHASE_NOT_RETURNABLE' });
		const existing = await tx.purchaseReturn.findFirst({
			where: {
				tenantId,
				originalPurchaseId: purchase.id,
				status: 'COMPLETED',
			},
			select: { id: true },
		});
		if (existing)
			throw new ConflictException({ reason: 'PURCHASE_ALREADY_RETURNED' });

		const returnDoc = await tx.purchaseReturn.create({
			data: {
				tenantId,
				docNo: `PRT-${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`,
				originalPurchaseId: purchase.id,
				supplierId: purchase.supplierId,
				warehouseId: purchase.warehouseId,
				status: 'COMPLETED',
				total: purchase.total,
				note: note?.trim() || null,
				createdBy: userId,
				completedAt: new Date(),
				lines: {
					create: purchase.lines.map((line) => ({
						purchaseLineId: line.id,
						productId: line.productId,
						batchId: line.batchId,
						qtyBase: line.qtyBase,
						lineTotal: line.lineTotal,
					})),
				},
			},
		});

		for (const line of purchase.lines) {
			await this.decrementStockLine(
				tx,
				tenantId,
				userId,
				purchase.warehouseId,
				returnDoc.id,
				line.productId,
				line.batchId,
				line.qtyBase,
			);
		}

		const debtAdjust = await this.applyDebtAdjust(
			tx,
			tenantId,
			userId,
			purchase.supplierId,
			purchase.debtAmount,
			returnDoc.id,
		);

		const completed = await tx.purchaseReturn.update({
			where: { id: returnDoc.id },
			data: { debtAdjust },
			include: { lines: true },
		});
		await this.audit.writeInTx(tx, {
			tenantId,
			actorId: userId,
			actorType: AuditActorType.USER,
			actorRoleCode: null,
			action: AuditAction.PURCHASE_RETURN,
			resource: 'purchase_return',
			resourceId: completed.id,
			after: {
				originalPurchaseId: purchase.id,
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
		purchaseId: string,
		dto: CreatePartialPurchaseReturnDto,
	) {
		if (dto.idempotencyKey) {
			const prior = await tx.purchaseReturn.findFirst({
				where: { tenantId, idempotencyKey: dto.idempotencyKey },
				include: { lines: true },
			});
			if (prior) return prior;
		}

		const purchase = await tx.purchase.findFirst({
			where: { id: purchaseId, tenantId, deletedAt: null },
			include: { lines: true },
		});
		if (!purchase) throw new NotFoundException('Purchase not found');
		if (purchase.status !== 'COMPLETED')
			throw new ConflictException({ reason: 'PURCHASE_NOT_RETURNABLE' });

		const mode = resolveSettlementMode(dto.settlementMode, purchase.debtAmount);
		if (
			mode === 'REFUND_VOUCHER' &&
			dto.debtAdjust !== undefined &&
			dto.debtAdjust !== null &&
			parseDebtAdjust(dto.debtAdjust) > 0n
		) {
			throw new ConflictException({ reason: 'SETTLEMENT_REQUIRED' });
		}

		const priorReturns = await tx.purchaseReturn.findMany({
			where: {
				tenantId,
				originalPurchaseId: purchase.id,
				status: 'COMPLETED',
			},
			include: { lines: true },
		});
		const returnedMap = new Map<string, number>();
		for (const ret of priorReturns) {
			for (const rl of ret.lines) {
				if (!rl.purchaseLineId) continue;
				addQty(returnedMap, rl.purchaseLineId, rl.batchId, rl.qtyBase);
			}
		}

		const lineById = new Map(purchase.lines.map((l) => [l.id, l]));
		const requestAgg = new Map<
			string,
			{ purchaseLineId: string; batchId: string | null; qty: number }
		>();
		for (const req of dto.lines) {
			const qty = decimalToNumber(req.qtyBase);
			if (!(qty > 0)) {
				throw new ConflictException({ reason: 'RETURN_QTY_EXCEEDS_REMAINING' });
			}
			const key = qtyKey(req.purchaseLineId, req.batchId ?? null);
			const cur = requestAgg.get(key);
			if (cur) cur.qty += qty;
			else
				requestAgg.set(key, {
					purchaseLineId: req.purchaseLineId,
					batchId: req.batchId ?? null,
					qty,
				});
		}

		type Planned = {
			purchaseLineId: string;
			productId: string;
			batchId: string | null;
			qtyBase: Prisma.Decimal;
			lineTotal: bigint;
		};
		const planned: Planned[] = [];
		let returnedMoney = 0n;

		for (const item of requestAgg.values()) {
			const line = lineById.get(item.purchaseLineId);
			if (!line) {
				throw new ConflictException({ reason: 'PURCHASE_NOT_RETURNABLE' });
			}
			const effectiveBatch = item.batchId ?? line.batchId ?? null;
			if (item.batchId && item.batchId !== line.batchId) {
				throw new ConflictException({ reason: 'BATCH_RETURN_CONFLICT' });
			}
			const orig = decimalToNumber(line.qtyBase);
			const already = returnedMap.get(qtyKey(line.id, effectiveBatch)) ?? 0;
			const rem = remainingQty(orig, already);
			if (item.qty > rem + 1e-9) {
				throw new ConflictException({
					reason: 'RETURN_QTY_EXCEEDS_REMAINING',
				});
			}
			if (rem <= 0) {
				throw new ConflictException({ reason: 'PURCHASE_ALREADY_RETURNED' });
			}

			const share =
				orig > 0
					? BigInt(Math.floor((Number(line.lineTotal) * item.qty) / orig))
					: 0n;
			returnedMoney += share;
			planned.push({
				purchaseLineId: line.id,
				productId: line.productId,
				batchId: effectiveBatch,
				qtyBase: new Prisma.Decimal(item.qty),
				lineTotal: share,
			});
		}

		const allReturned = purchase.lines.every((line) => {
			const rem = remainingQty(
				decimalToNumber(line.qtyBase),
				returnedMap.get(qtyKey(line.id, line.batchId)) ?? 0,
			);
			return rem <= 0;
		});
		if (allReturned) {
			throw new ConflictException({ reason: 'PURCHASE_ALREADY_RETURNED' });
		}

		const returnDoc = await tx.purchaseReturn.create({
			data: {
				tenantId,
				docNo: `PRT-${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`,
				originalPurchaseId: purchase.id,
				supplierId: purchase.supplierId,
				warehouseId: purchase.warehouseId,
				status: 'COMPLETED',
				total: returnedMoney,
				note: dto.note?.trim() || null,
				idempotencyKey: dto.idempotencyKey?.trim() || null,
				createdBy: userId,
				completedAt: new Date(),
				lines: {
					create: planned.map((p) => ({
						purchaseLineId: p.purchaseLineId,
						productId: p.productId,
						batchId: p.batchId,
						qtyBase: p.qtyBase,
						lineTotal: p.lineTotal,
					})),
				},
			},
		});

		for (const p of planned) {
			await this.decrementStockLine(
				tx,
				tenantId,
				userId,
				purchase.warehouseId,
				returnDoc.id,
				p.productId,
				p.batchId,
				p.qtyBase,
			);
		}

		let debtTarget = 0n;
		if (mode === 'DEBT_ADJUST_ONLY' && purchase.debtAmount > 0n) {
			const share = proRataDebt(
				purchase.debtAmount,
				returnedMoney,
				purchase.total,
			);
			if (dto.debtAdjust !== undefined && dto.debtAdjust !== null) {
				const requested = parseDebtAdjust(dto.debtAdjust);
				if (requested < 0n || requested > share) {
					throw new ConflictException({ reason: 'DEBT_RETURN_CONFLICT' });
				}
				debtTarget = requested;
			} else {
				debtTarget = share;
			}
		} else if (
			dto.debtAdjust &&
			parseDebtAdjust(dto.debtAdjust) > 0n &&
			mode === 'NONE'
		) {
			throw new ConflictException({ reason: 'SETTLEMENT_REQUIRED' });
		}

		const debtAdjust = await this.applyDebtAdjust(
			tx,
			tenantId,
			userId,
			purchase.supplierId,
			debtTarget,
			returnDoc.id,
		);

		let refund: RefundVoucherResult | null = null;
		if (mode === 'REFUND_VOUCHER') {
			const priorRefunded = await sumPriorRefunds(
				tx,
				tenantId,
				'SUPPLIER',
				purchase.id,
			);
			const cap = resolveRefundCap(
				purchase.amountPaid,
				priorRefunded,
				returnedMoney,
			);
			const amount = resolveRefundAmount(dto.refundAmount, cap);
			refund = await writeRefundVoucher(tx, {
				tenantId,
				userId,
				partyType: 'SUPPLIER',
				partyId: purchase.supplierId,
				originalId: purchase.id,
				returnId: returnDoc.id,
				amount,
				method: parseRefundMethod(dto.refundMethod),
				note: dto.note,
			});
		}

		const completed = await tx.purchaseReturn.update({
			where: { id: returnDoc.id },
			data: { debtAdjust },
			include: { lines: true },
		});
		await this.audit.writeInTx(tx, {
			tenantId,
			actorId: userId,
			actorType: AuditActorType.USER,
			actorRoleCode: null,
			action: AuditAction.PURCHASE_RETURN,
			resource: 'purchase_return',
			resourceId: completed.id,
			after: {
				originalPurchaseId: purchase.id,
				mode: 'PARTIAL',
				total: completed.total.toString(),
				debtAdjust: completed.debtAdjust.toString(),
			},
		});
		if (refund) {
			await this.audit.writeInTx(tx, {
				tenantId,
				actorId: userId,
				actorType: AuditActorType.USER,
				actorRoleCode: null,
				action: AuditAction.PURCHASE_REFUND,
				resource: 'payment_voucher',
				resourceId: refund.voucherId,
				after: {
					returnId: completed.id,
					voucherId: refund.voucherId,
					docNo: refund.docNo,
					amount: refund.amount.toString(),
					method: refund.method,
					partyType: refund.partyType,
					partyId: refund.partyId,
				},
			});
		}
		return completed;
	}

	private async decrementStockLine(
		tx: Tx,
		tenantId: string,
		userId: string,
		warehouseId: string,
		returnId: string,
		productId: string,
		batchId: string | null,
		qtyBase: Prisma.Decimal,
	) {
		const stock = await tx.stock.updateMany({
			where: {
				tenantId,
				warehouseId,
				productId,
				qty: { gte: qtyBase },
			},
			data: { qty: { decrement: qtyBase } },
		});
		if (stock.count !== 1)
			throw new ConflictException({ reason: 'STOCK_RETURN_CONFLICT' });
		if (batchId) {
			const currentBatch = await tx.productBatch.findFirst({
				where: { id: batchId, tenantId },
				select: { id: true, version: true },
			});
			if (!currentBatch)
				throw new ConflictException({ reason: 'BATCH_RETURN_CONFLICT' });
			const batch = await tx.productBatch.updateMany({
				where: {
					id: currentBatch.id,
					tenantId,
					version: currentBatch.version,
					qtyOnHand: { gte: qtyBase },
				},
				data: {
					qtyOnHand: { decrement: qtyBase },
					version: { increment: 1 },
				},
			});
			if (batch.count !== 1)
				throw new ConflictException({ reason: 'BATCH_RETURN_CONFLICT' });
		}
		await tx.stockMovement.create({
			data: {
				tenantId,
				warehouseId,
				productId,
				batchId,
				direction: StockDirection.OUT,
				qty: qtyBase,
				reason: StockReason.PURCHASE_RETURN,
				refType: 'PURCHASE_RETURN',
				refId: returnId,
				createdBy: userId,
			},
		});
	}

	private async applyDebtAdjust(
		tx: Tx,
		tenantId: string,
		userId: string,
		supplierId: string,
		amount: bigint,
		returnId: string,
	): Promise<bigint> {
		if (amount <= 0n) return 0n;
		const updated = await tx.supplier.updateMany({
			where: {
				id: supplierId,
				tenantId,
				deletedAt: null,
				balance: { gte: amount },
			},
			data: { balance: { decrement: amount } },
		});
		if (updated.count !== 1)
			throw new ConflictException({ reason: 'DEBT_RETURN_CONFLICT' });
		const supplier = await tx.supplier.findFirstOrThrow({
			where: { id: supplierId, tenantId, deletedAt: null },
			select: { balance: true },
		});
		await tx.debtLedger.create({
			data: {
				tenantId,
				partyType: 'SUPPLIER',
				partyId: supplierId,
				entryType: 'ADJUST',
				direction: 'DECREASE',
				amount,
				balanceAfter: supplier.balance,
				refType: 'PURCHASE_RETURN',
				refId: returnId,
				createdBy: userId,
			},
		});
		return amount;
	}
}
