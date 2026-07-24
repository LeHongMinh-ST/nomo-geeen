import { randomUUID } from 'node:crypto';
import {
	ConflictException,
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
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
			(tx) => this.createInTransaction(tx, tenantId, userId, saleId, note),
			{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
		);
	}

	private async createInTransaction(
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
						productId: line.productId,
						qtyBase: line.qtyBase,
						lineTotal: line.lineTotal,
					})),
				},
			},
		});

		for (const line of sale.lines) {
			const stock = await tx.stock.updateMany({
				where: {
					tenantId,
					warehouseId: sale.warehouseId,
					productId: line.productId,
				},
				data: { qty: { increment: line.qtyBase } },
			});
			if (stock.count !== 1)
				throw new ConflictException({ reason: 'STOCK_RETURN_CONFLICT' });

			if (line.batches.length > 0) {
				for (const allocation of line.batches) {
					const batch = await tx.productBatch.updateMany({
						where: { id: allocation.batchId, tenantId },
						data: { qtyOnHand: { increment: allocation.qtyBase } },
					});
					if (batch.count !== 1)
						throw new ConflictException({ reason: 'BATCH_RETURN_CONFLICT' });
					await tx.stockMovement.create({
						data: {
							tenantId,
							warehouseId: sale.warehouseId,
							productId: line.productId,
							batchId: allocation.batchId,
							direction: StockDirection.IN,
							qty: allocation.qtyBase,
							reason: StockReason.SALE_RETURN,
							refType: 'SALE_RETURN',
							refId: returnDoc.id,
							createdBy: userId,
						},
					});
				}
			} else {
				await tx.stockMovement.create({
					data: {
						tenantId,
						warehouseId: sale.warehouseId,
						productId: line.productId,
						direction: StockDirection.IN,
						qty: line.qtyBase,
						reason: StockReason.SALE_RETURN,
						refType: 'SALE_RETURN',
						refId: returnDoc.id,
						createdBy: userId,
					},
				});
			}
		}

		let debtAdjust = 0n;
		if (sale.debtAmount > 0n) {
			if (!sale.customerId)
				throw new ConflictException({ reason: 'DEBT_RETURN_CONFLICT' });
			const updated = await tx.customer.updateMany({
				where: {
					id: sale.customerId,
					tenantId,
					deletedAt: null,
					balance: { gte: sale.debtAmount },
				},
				data: { balance: { decrement: sale.debtAmount } },
			});
			if (updated.count !== 1)
				throw new ConflictException({ reason: 'DEBT_RETURN_CONFLICT' });
			const customer = await tx.customer.findFirstOrThrow({
				where: { id: sale.customerId, tenantId, deletedAt: null },
				select: { balance: true },
			});
			debtAdjust = sale.debtAmount;
			await tx.debtLedger.create({
				data: {
					tenantId,
					partyType: 'CUSTOMER',
					partyId: sale.customerId,
					entryType: 'ADJUST',
					direction: 'DECREASE',
					amount: sale.debtAmount,
					balanceAfter: customer.balance,
					refType: 'SALE_RETURN',
					refId: returnDoc.id,
					createdBy: userId,
				},
			});
		}

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
				total: completed.total.toString(),
				debtAdjust: completed.debtAdjust.toString(),
			},
		});
		return completed;
	}
}
