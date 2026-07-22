import { randomUUID } from 'node:crypto';
import {
	ConflictException,
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import {
	Prisma,
	ProductKind,
	PurchaseStatus,
	StockDirection,
	StockReason,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
	CreatePurchaseDto,
	PurchaseCreateStatus,
} from './dto/create-purchase.dto';
import { PurchaseQueryDto } from './dto/purchase-query.dto';
import {
	calculateDebtAmount,
	calculatePurchaseTotal,
	deriveBaseQuantity,
} from './purchase-contracts';

type Tx = Prisma.TransactionClient;
type PurchaseLineRenderable = {
	id: string;
	productId: string;
	product?: { name: string; sku: string };
	unitId: string;
	qty: Prisma.Decimal;
	qtyBase: Prisma.Decimal;
	unitPrice: bigint;
	lineDiscount: bigint;
	lineTotal: bigint;
	batchCode: string | null;
	expiresAt: Date | null;
	unit?: { id: string; code: string; name: string };
};
type PurchaseRenderable = {
	id: string;
	docNo: string;
	idempotencyKey: string | null;
	status: PurchaseStatus;
	supplierId: string;
	supplier?: { name: string };
	warehouseId: string;
	subtotal: bigint;
	discountAmount: bigint;
	shippingFee: bigint;
	total: bigint;
	amountPaid: bigint;
	paymentMethod: string;
	debtAmount: bigint;
	lines: PurchaseLineRenderable[];
	createdAt: Date;
	completedAt: Date | null;
};
type PreparedLine = {
	productId: string;
	unitId: string;
	qty: Prisma.Decimal;
	qtyBase: Prisma.Decimal;
	unitPrice: bigint;
	lineDiscount: bigint;
	lineTotal: bigint;
	batchCode?: string;
	expiresAt?: Date;
	productKind?: ProductKind;
};

@Injectable()
export class PurchasesService {
	constructor(private readonly prisma: PrismaService) {}

	async list(tenantId: string, query: PurchaseQueryDto) {
		const page = query.page ?? 1;
		const pageSize = query.pageSize ?? 20;
		const where: Prisma.PurchaseWhereInput = {
			tenantId,
			deletedAt: null,
			...(query.status ? { status: query.status } : {}),
		};
		if (query.search?.trim())
			where.OR = [
				{ docNo: { contains: query.search.trim(), mode: 'insensitive' } },
				{
					supplier: {
						name: { contains: query.search.trim(), mode: 'insensitive' },
					},
				},
			];
		const [items, total] = await Promise.all([
			this.prisma.purchase.findMany({
				where,
				orderBy: [{ purchasedAt: 'desc' }, { id: 'desc' }],
				skip: (page - 1) * pageSize,
				take: pageSize,
				include: this.includePurchase(),
			}),
			this.prisma.purchase.count({ where }),
		]);
		return {
			items: items.map((item) => this.toResponse(item)),
			page,
			pageSize,
			total,
		};
	}

	async findById(tenantId: string, id: string) {
		const purchase = await this.prisma.purchase.findFirst({
			where: { id, tenantId, deletedAt: null },
			include: this.includePurchase(),
		});
		if (!purchase) throw new NotFoundException('Purchase not found');
		return this.toResponse(purchase);
	}

	async create(tenantId: string, userId: string, dto: CreatePurchaseDto) {
		return this.prisma.$transaction(
			async (tx) => {
				const existing = await tx.purchase.findFirst({
					where: { tenantId, idempotencyKey: dto.idempotencyKey },
					include: this.includePurchase(),
				});
				if (existing) {
					if (!this.matchesRequest(existing, dto))
						throw this.idempotencyConflict();
					return this.toResponse(existing);
				}
				const prepared = await this.prepareLines(tx, tenantId, dto);
				const totals = this.calculateTotals(prepared, dto);
				const warehouseId = await this.resolveWarehouse(tx, tenantId);
				const supplier = await this.requireSupplier(
					tx,
					tenantId,
					dto.supplierId,
				);
				const purchase = await tx.purchase.create({
					data: {
						tenantId,
						docNo: `PN-${randomUUID().slice(0, 8).toUpperCase()}`,
						idempotencyKey: dto.idempotencyKey,
						supplierId: supplier.id,
						warehouseId,
						status: PurchaseStatus.DRAFT,
						subtotal: totals.subtotal,
						discountAmount: totals.discountAmount,
						shippingFee: totals.shippingFee,
						total: totals.total,
						amountPaid: totals.amountPaid,
						paymentMethod: dto.paymentMethod,
						debtAmount: totals.debtAmount,
						note: dto.note,
						createdBy: userId,
						lines: {
							create: prepared.map((line) => ({
								tenantId,
								productId: line.productId,
								unitId: line.unitId,
								qty: line.qty,
								qtyBase: line.qtyBase,
								unitPrice: line.unitPrice,
								lineDiscount: line.lineDiscount,
								lineTotal: line.lineTotal,
								batchCode: line.batchCode,
								expiresAt: line.expiresAt,
							})),
						},
					},
					include: this.includePurchase(),
				});
				if (dto.status === PurchaseCreateStatus.COMPLETED)
					return this.toResponse(
						await this.completeInTransaction(
							tx,
							tenantId,
							userId,
							purchase.id,
							dto.idempotencyKey,
						),
					);
				return this.toResponse(purchase);
			},
			{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
		);
	}

	async updateDraft(
		tenantId: string,
		_userId: string,
		id: string,
		dto: CreatePurchaseDto,
	) {
		return this.prisma.$transaction(
			async (tx) => {
				const current = await tx.purchase.findFirst({
					where: { id, tenantId, deletedAt: null },
					include: { lines: true },
				});
				if (!current) throw new NotFoundException('Purchase not found');
				if (current.status !== PurchaseStatus.DRAFT) throw this.invalidState();
				const prepared = await this.prepareLines(tx, tenantId, dto);
				const totals = this.calculateTotals(prepared, dto);
				const supplier = await this.requireSupplier(
					tx,
					tenantId,
					dto.supplierId,
				);
				await tx.purchaseLine.deleteMany({ where: { purchaseId: current.id } });
				const updated = await tx.purchase.update({
					where: { id: current.id },
					data: {
						supplierId: supplier.id,
						idempotencyKey: dto.idempotencyKey,
						subtotal: totals.subtotal,
						discountAmount: totals.discountAmount,
						shippingFee: totals.shippingFee,
						total: totals.total,
						amountPaid: totals.amountPaid,
						paymentMethod: dto.paymentMethod,
						debtAmount: totals.debtAmount,
						note: dto.note,
						updatedAt: new Date(),
						lines: {
							create: prepared.map((line) => ({
								tenantId,
								productId: line.productId,
								unitId: line.unitId,
								qty: line.qty,
								qtyBase: line.qtyBase,
								unitPrice: line.unitPrice,
								lineDiscount: line.lineDiscount,
								lineTotal: line.lineTotal,
								batchCode: line.batchCode,
								expiresAt: line.expiresAt,
							})),
						},
					},
					include: this.includePurchase(),
				});
				return this.toResponse(updated);
			},
			{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
		);
	}

	async complete(
		tenantId: string,
		userId: string,
		id: string,
		idempotencyKey: string,
	) {
		for (let attempt = 0; attempt < 3; attempt += 1) {
			try {
				return await this.prisma.$transaction(
					async (tx) =>
						this.toResponse(
							await this.completeInTransaction(
								tx,
								tenantId,
								userId,
								id,
								idempotencyKey,
							),
						),
					{ isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
				);
			} catch (error) {
				if (!this.isSerializationConflict(error) || attempt === 2) throw error;
			}
		}
		throw new ConflictException('Purchase completion could not be serialized');
	}

	async cancel(tenantId: string, id: string) {
		const purchase = await this.prisma.purchase.findFirst({
			where: { id, tenantId, deletedAt: null },
		});
		if (!purchase) throw new NotFoundException('Purchase not found');
		if (purchase.status !== PurchaseStatus.DRAFT) throw this.invalidState();
		return this.toResponse(
			await this.prisma.purchase.update({
				where: { id },
				data: { status: PurchaseStatus.CANCELLED },
				include: this.includePurchase(),
			}),
		);
	}

	private async completeInTransaction(
		tx: Tx,
		tenantId: string,
		userId: string,
		id: string,
		idempotencyKey: string,
	) {
		const purchase = await tx.purchase.findFirst({
			where: { id, tenantId, deletedAt: null },
			include: {
				lines: { include: { product: { select: { productKind: true } } } },
			},
		});
		if (!purchase) throw new NotFoundException('Purchase not found');
		if (purchase.idempotencyKey !== idempotencyKey)
			throw this.idempotencyConflict();
		if (purchase.status === PurchaseStatus.COMPLETED)
			return tx.purchase.findUniqueOrThrow({
				where: { id },
				include: this.includePurchase(),
			});
		if (purchase.status !== PurchaseStatus.DRAFT) throw this.invalidState();
		const warehouseId = await this.resolveWarehouse(tx, tenantId);
		if (warehouseId !== purchase.warehouseId) throw this.invalidState();
		const lineSubtotal = purchase.lines.reduce(
			(sum, line) => sum + BigInt(line.lineTotal),
			0n,
		);
		let discountRemaining = BigInt(purchase.discountAmount);
		let shippingRemaining = BigInt(purchase.shippingFee);
		for (const [index, line] of purchase.lines.entries()) {
			const isLastLine = index === purchase.lines.length - 1;
			const discountShare = isLastLine
				? discountRemaining
				: lineSubtotal === 0n
					? 0n
					: (BigInt(line.lineTotal) * BigInt(purchase.discountAmount)) /
						lineSubtotal;
			const shippingShare = isLastLine
				? shippingRemaining
				: lineSubtotal === 0n
					? 0n
					: (BigInt(line.lineTotal) * BigInt(purchase.shippingFee)) /
						lineSubtotal;
			discountRemaining -= discountShare;
			shippingRemaining -= shippingShare;
			const effectiveLineCost =
				BigInt(line.lineTotal) - discountShare + shippingShare;
			const unitCost = this.toUnitCost(effectiveLineCost, line.qtyBase);
			let batchId: string | undefined;
			if (this.isBatchControlled(line.product.productKind)) {
				if (!line.batchCode)
					throw new UnprocessableEntityException({
						reason: 'BATCH_REQUIRED',
						message: 'Batch code is required for this product',
					});
				const batch = await tx.productBatch.upsert({
					where: {
						tenantId_productId_warehouseId_batchCode: {
							tenantId,
							productId: line.productId,
							warehouseId: purchase.warehouseId,
							batchCode: line.batchCode,
						},
					},
					create: {
						tenantId,
						productId: line.productId,
						warehouseId: purchase.warehouseId,
						batchCode: line.batchCode,
						expiresAt: line.expiresAt ?? null,
						qtyOnHand: line.qtyBase,
					},
					update: { qtyOnHand: { increment: line.qtyBase } },
					select: { id: true },
				});
				batchId = batch.id;
				await tx.purchaseLine.update({
					where: { id: line.id },
					data: { batchId },
				});
			}
			const stock = await tx.stock.findUnique({
				where: {
					warehouseId_productId: {
						warehouseId: purchase.warehouseId,
						productId: line.productId,
					},
				},
			});
			const oldQty = stock?.qty ?? new Prisma.Decimal(0);
			const nextQty = oldQty.add(line.qtyBase);
			const nextAvg = oldQty.gt(0)
				? this.weightedAverage(
						oldQty,
						stock?.avgCost ?? 0n,
						line.qtyBase,
						unitCost,
					)
				: unitCost;
			if (stock)
				await tx.stock.update({
					where: { id: stock.id },
					data: { qty: nextQty, avgCost: nextAvg },
				});
			else
				await tx.stock.create({
					data: {
						tenantId,
						warehouseId: purchase.warehouseId,
						productId: line.productId,
						qty: line.qtyBase,
						avgCost: nextAvg,
					},
				});
			await tx.stockMovement.create({
				data: {
					tenantId,
					warehouseId: purchase.warehouseId,
					productId: line.productId,
					batchId,
					direction: StockDirection.IN,
					qty: line.qtyBase,
					unitCost,
					reason: StockReason.PURCHASE,
					refType: 'PURCHASE',
					refId: purchase.id,
					refLineId: line.id,
					createdBy: userId,
				},
			});
		}
		const debtAmount = BigInt(purchase.debtAmount);
		if (debtAmount > 0n) {
			const supplier = await tx.supplier.update({
				where: { id: purchase.supplierId },
				data: { balance: { increment: debtAmount } },
				select: { balance: true },
			});
			await tx.debtLedger.create({
				data: {
					tenantId,
					partyType: 'SUPPLIER',
					partyId: purchase.supplierId,
					entryType: 'PURCHASE',
					direction: 'INCREASE',
					amount: debtAmount,
					balanceAfter: supplier.balance,
					refType: 'PURCHASE',
					refId: purchase.id,
					createdBy: userId,
				},
			});
		}
		return tx.purchase.update({
			where: { id: purchase.id },
			data: {
				status: PurchaseStatus.COMPLETED,
				completedAt: new Date(),
				updatedAt: new Date(),
			},
			include: this.includePurchase(),
		});
	}

	private async prepareLines(
		tx: Tx,
		tenantId: string,
		dto: CreatePurchaseDto,
	): Promise<PreparedLine[]> {
		const ids = [...new Set(dto.lines.map((line) => line.productId))];
		const products = await tx.product.findMany({
			where: { tenantId, id: { in: ids }, deletedAt: null },
			include: {
				conversions: {
					where: { kind: { in: ['PURCHASE', 'BOTH'] } },
					select: { unitId: true, factorToBase: true },
				},
			},
		});
		const byId = new Map(products.map((product) => [product.id, product]));
		return dto.lines.map((line) => {
			const product = byId.get(line.productId);
			if (!product) throw this.invalidProduct();
			if (product.status !== 'ACTIVE' || product.isLocked || product.isRecalled)
				throw this.invalidProduct();
			const factor =
				line.unitId === product.baseUnitId
					? new Prisma.Decimal(1)
					: product.conversions.find(
							(conversion) => conversion.unitId === line.unitId,
						)?.factorToBase;
			if (!factor) throw this.invalidConversion();
			const qty = new Prisma.Decimal(line.qty);
			const qtyBase = deriveBaseQuantity(line.qty, factor.toString());
			const unitPrice = BigInt(line.unitPrice);
			const lineDiscount = BigInt(line.lineDiscount ?? 0);
			const gross = this.decimalMoney(qty.mul(unitPrice.toString()));
			const lineTotal = gross - lineDiscount;
			if (lineTotal < 0n) throw this.invalidMoney();
			return {
				productId: line.productId,
				unitId: line.unitId,
				qty,
				qtyBase,
				unitPrice,
				lineDiscount,
				lineTotal,
				batchCode: line.batchCode,
				expiresAt: line.expiresAt ? new Date(line.expiresAt) : undefined,
				productKind: product.productKind,
			};
		});
	}

	private calculateTotals(lines: PreparedLine[], dto: CreatePurchaseDto) {
		const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0n);
		const discountAmount = BigInt(dto.discountAmount);
		const shippingFee = BigInt(dto.shippingFee);
		const total = calculatePurchaseTotal(subtotal, discountAmount, shippingFee);
		const amountPaid = BigInt(dto.amountPaid);
		if (
			amountPaid > total ||
			(dto.paymentMethod === 'DEBT' && amountPaid !== 0n)
		)
			throw this.invalidMoney();
		return {
			subtotal,
			discountAmount,
			shippingFee,
			total,
			amountPaid,
			debtAmount: calculateDebtAmount(total, amountPaid),
		};
	}
	private async resolveWarehouse(tx: Tx, tenantId: string) {
		const rows = await tx.warehouse.findMany({
			where: { tenantId, isDefault: true, deletedAt: null },
			select: { id: true },
		});
		if (rows.length !== 1)
			throw new UnprocessableEntityException({
				reason: 'WAREHOUSE_CONFIGURATION_ERROR',
				message: 'Exactly one default warehouse is required',
			});
		return rows[0].id;
	}
	private isBatchControlled(productKind?: ProductKind) {
		return productKind !== undefined && productKind !== ProductKind.OTHER;
	}
	private async requireSupplier(tx: Tx, tenantId: string, id: string) {
		const supplier = await tx.supplier.findFirst({
			where: { id, tenantId, deletedAt: null, status: 'ACTIVE' },
		});
		if (!supplier)
			throw new UnprocessableEntityException({
				reason: 'INVALID_SUPPLIER',
				message: 'Supplier is missing, inactive, or outside the tenant',
			});
		return supplier;
	}
	private decimalMoney(value: Prisma.Decimal) {
		return BigInt(value.toDecimalPlaces(0).toFixed(0));
	}
	private toUnitCost(lineTotal: bigint, qtyBase: Prisma.Decimal) {
		if (!qtyBase.gt(0)) throw this.invalidMoney();
		return BigInt(
			new Prisma.Decimal(lineTotal.toString())
				.div(qtyBase)
				.toDecimalPlaces(0)
				.toFixed(0),
		);
	}
	private weightedAverage(
		oldQty: Prisma.Decimal,
		oldCost: bigint,
		receivedQty: Prisma.Decimal,
		receivedCost: bigint,
	) {
		return BigInt(
			oldQty
				.mul(oldCost.toString())
				.add(receivedQty.mul(receivedCost.toString()))
				.div(oldQty.add(receivedQty))
				.toDecimalPlaces(0)
				.toFixed(0),
		);
	}
	private matchesRequest(existing: PurchaseRenderable, dto: CreatePurchaseDto) {
		return (
			existing.supplierId === dto.supplierId &&
			Number(existing.discountAmount) === dto.discountAmount &&
			Number(existing.shippingFee) === dto.shippingFee &&
			(existing.paymentMethod ?? 'CASH') === dto.paymentMethod &&
			Number(existing.amountPaid) === dto.amountPaid &&
			existing.status ===
				(dto.status === 'COMPLETED'
					? PurchaseStatus.COMPLETED
					: PurchaseStatus.DRAFT) &&
			existing.lines.length === dto.lines.length &&
			existing.lines.every(
				(line: PurchaseLineRenderable, index: number) =>
					line.productId === dto.lines[index].productId &&
					line.unitId === dto.lines[index].unitId &&
					line.qty.toString() === dto.lines[index].qty &&
					Number(line.unitPrice) === dto.lines[index].unitPrice &&
					Number(line.lineDiscount) === (dto.lines[index].lineDiscount ?? 0),
			)
		);
	}
	private includePurchase() {
		return {
			supplier: true,
			warehouse: true,
			lines: {
				include: {
					product: { select: { name: true, sku: true } },
					unit: { select: { id: true, code: true, name: true } },
				},
			},
		} as const;
	}
	private toResponse(purchase: PurchaseRenderable) {
		return {
			id: purchase.id,
			docNo: purchase.docNo,
			idempotencyKey: purchase.idempotencyKey,
			status: purchase.status,
			supplierId: purchase.supplierId,
			supplierName: purchase.supplier?.name,
			warehouseId: purchase.warehouseId,
			subtotal: Number(purchase.subtotal),
			discountAmount: Number(purchase.discountAmount),
			shippingFee: Number(purchase.shippingFee),
			total: Number(purchase.total),
			amountPaid: Number(purchase.amountPaid),
			debtAmount: Number(purchase.debtAmount),
			paymentMethod: purchase.paymentMethod,
			lines: purchase.lines.map((line: PurchaseLineRenderable) => ({
				id: line.id,
				productId: line.productId,
				productName: line.product?.name,
				sku: line.product?.sku,
				unitId: line.unitId,
				qty: line.qty.toString(),
				qtyBase: line.qtyBase.toString(),
				unitPrice: Number(line.unitPrice),
				lineDiscount: Number(line.lineDiscount),
				lineTotal: Number(line.lineTotal),
				batchCode: line.batchCode,
				expiresAt: line.expiresAt,
				unit: line.unit,
			})),
			createdAt: purchase.createdAt,
			completedAt: purchase.completedAt,
		};
	}
	private isSerializationConflict(error: unknown) {
		return (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === 'P2034'
		);
	}
	private invalidProduct() {
		return new UnprocessableEntityException({
			reason: 'INVALID_PRODUCT',
			message: 'Product is missing, inactive, locked, or recalled',
		});
	}
	private invalidConversion() {
		return new UnprocessableEntityException({
			reason: 'INVALID_CONVERSION',
			message: 'Purchase unit conversion is invalid',
		});
	}
	private invalidMoney() {
		return new UnprocessableEntityException({
			reason: 'VALIDATION_ERROR',
			message: 'Purchase monetary values are invalid',
		});
	}
	private invalidState() {
		return new ConflictException({
			reason: 'INVALID_STATE',
			message: 'Purchase lifecycle transition is invalid',
		});
	}
	private idempotencyConflict() {
		return new ConflictException({
			reason: 'IDEMPOTENCY_CONFLICT',
			message: 'Idempotency key was already used for another purchase',
		});
	}
}
