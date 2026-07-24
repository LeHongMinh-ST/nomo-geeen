import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, AuditActorType, Prisma, StockDirection, StockReason } from '@prisma/client';
import { AuditLogger } from '../audit/audit-logger.service';
import { PrismaService } from '../prisma/prisma.service';

type Tx = Prisma.TransactionClient;

@Injectable()
export class PurchaseReturnsService {
	constructor(private readonly prisma: PrismaService, private readonly audit: AuditLogger) {}

	async createFullReturn(tenantId: string, userId: string, purchaseId: string, note?: string) {
		return this.prisma.$transaction(
			(tx) => this.createInTransaction(tx, tenantId, userId, purchaseId, note),
			{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
		);
	}

	private async createInTransaction(tx: Tx, tenantId: string, userId: string, purchaseId: string, note?: string) {
		const purchase = await tx.purchase.findFirst({ where: { id: purchaseId, tenantId, deletedAt: null }, include: { lines: true } });
		if (!purchase) throw new NotFoundException('Purchase not found');
		if (purchase.status !== 'COMPLETED') throw new ConflictException({ reason: 'PURCHASE_NOT_RETURNABLE' });
		const existing = await tx.purchaseReturn.findFirst({ where: { tenantId, originalPurchaseId: purchase.id, status: 'COMPLETED' }, select: { id: true } });
		if (existing) throw new ConflictException({ reason: 'PURCHASE_ALREADY_RETURNED' });

		const returnDoc = await tx.purchaseReturn.create({
			data: {
				tenantId, docNo: `PRT-${randomUUID().replace(/-/g, '').slice(0, 16).toUpperCase()}`,
				originalPurchaseId: purchase.id, supplierId: purchase.supplierId, warehouseId: purchase.warehouseId,
				status: 'COMPLETED', total: purchase.total, note: note?.trim() || null, createdBy: userId, completedAt: new Date(),
				lines: { create: purchase.lines.map((line) => ({ productId: line.productId, batchId: line.batchId, qtyBase: line.qtyBase, lineTotal: line.lineTotal })) },
			},
		});

		for (const line of purchase.lines) {
			const stock = await tx.stock.updateMany({ where: { tenantId, warehouseId: purchase.warehouseId, productId: line.productId, qty: { gte: line.qtyBase } }, data: { qty: { decrement: line.qtyBase } } });
			if (stock.count !== 1) throw new ConflictException({ reason: 'STOCK_RETURN_CONFLICT' });
			if (line.batchId) {
				const batch = await tx.productBatch.updateMany({ where: { id: line.batchId, tenantId, qtyOnHand: { gte: line.qtyBase } }, data: { qtyOnHand: { decrement: line.qtyBase } } });
				if (batch.count !== 1) throw new ConflictException({ reason: 'BATCH_RETURN_CONFLICT' });
			}
			await tx.stockMovement.create({ data: { tenantId, warehouseId: purchase.warehouseId, productId: line.productId, batchId: line.batchId, direction: StockDirection.OUT, qty: line.qtyBase, reason: StockReason.PURCHASE_RETURN, refType: 'PURCHASE_RETURN', refId: returnDoc.id, createdBy: userId } });
		}

		let debtAdjust = 0n;
		if (purchase.debtAmount > 0n) {
			const updated = await tx.supplier.updateMany({ where: { id: purchase.supplierId, tenantId, deletedAt: null, balance: { gte: purchase.debtAmount } }, data: { balance: { decrement: purchase.debtAmount } } });
			if (updated.count !== 1) throw new ConflictException({ reason: 'DEBT_RETURN_CONFLICT' });
			const supplier = await tx.supplier.findFirstOrThrow({ where: { id: purchase.supplierId, tenantId, deletedAt: null }, select: { balance: true } });
			debtAdjust = purchase.debtAmount;
			await tx.debtLedger.create({ data: { tenantId, partyType: 'SUPPLIER', partyId: purchase.supplierId, entryType: 'ADJUST', direction: 'DECREASE', amount: purchase.debtAmount, balanceAfter: supplier.balance, refType: 'PURCHASE_RETURN', refId: returnDoc.id, createdBy: userId } });
		}

		const completed = await tx.purchaseReturn.update({ where: { id: returnDoc.id }, data: { debtAdjust }, include: { lines: true } });
		await this.audit.writeInTx(tx, { tenantId, actorId: userId, actorType: AuditActorType.USER, actorRoleCode: null, action: AuditAction.PURCHASE_RETURN, resource: 'purchase_return', resourceId: completed.id, after: { originalPurchaseId: purchase.id, total: completed.total.toString(), debtAdjust: completed.debtAdjust.toString() } });
		return completed;
	}
}
