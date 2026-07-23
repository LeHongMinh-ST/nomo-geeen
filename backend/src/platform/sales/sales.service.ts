import { randomUUID } from 'node:crypto';
import {
	ConflictException,
	Injectable,
	InternalServerErrorException,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { EntitlementService } from '../entitlements/entitlement.service';
import { resolveSaleAllocations } from '../inventory/fefo-allocator';
import { PrismaService } from '../prisma/prisma.service';
import type { CompleteSalesOrderDto } from './dto/complete-sales-order.dto';
import type { CreateQuickSaleDto } from './dto/create-quick-sale.dto';
import { QuickSalePaymentMethod } from './dto/create-quick-sale.dto';
import type { CreateSalesOrderDto } from './dto/create-sales-order.dto';
import {
	SalesOrderCreateStatus,
	SalesOrderPaymentMethod,
} from './dto/create-sales-order.dto';
import type { SalesOrderQueryDto } from './dto/sales-order-query.dto';

type QuickSaleResponse = {
	id: string;
	docNo: string;
	status: 'COMPLETED';
	subtotal: number;
	discountAmount: number;
	total: number;
	amountPaid: number;
	changeAmount: number;
	debtAmount: number;
	paymentMethod: QuickSalePaymentMethod;
	lines: Array<{
		productId: string;
		qty: number;
		qtyBase: number;
		unitPrice: number;
		lineTotal: number;
	}>;
};

type NormalizedLine = {
	productId: string;
	unitId: string;
	qty: number;
	unitPrice: bigint;
};

type OrderWithLines = Prisma.SaleGetPayload<{ include: { lines: true } }>;
type OrderDetailRecord = Prisma.SaleGetPayload<{
	include: {
		lines: { include: { unit: { select: { id: true; name: true } } } };
	};
}>;
type OrderSummaryRecord = Prisma.SaleGetPayload<{
	include: { _count: { select: { lines: true } } };
}>;
type NormalizedOrderSettlement = {
	paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'QR' | null;
	amountPaid: bigint;
	changeAmount: bigint;
	debtAmount: bigint;
};

@Injectable()
export class SalesService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly entitlements: EntitlementService,
	) {}

	async listOrders(tenantId: string, query: SalesOrderQueryDto) {
		const page = query.page ?? 1;
		const pageSize = query.pageSize ?? 20;
		const search = query.search?.trim();
		const where: Prisma.SaleWhereInput = {
			tenantId,
			channel: 'ORDER',
			deletedAt: null,
			...(query.status ? { status: query.status } : {}),
			...(search
				? {
						OR: [
							{ docNo: { contains: search, mode: 'insensitive' } },
							{
								customerNameSnapshot: { contains: search, mode: 'insensitive' },
							},
						],
					}
				: {}),
		};
		const [sales, total] = await Promise.all([
			this.prisma.sale.findMany({
				where,
				orderBy: [{ soldAt: 'desc' }, { id: 'desc' }],
				skip: (page - 1) * pageSize,
				take: pageSize,
				include: { _count: { select: { lines: true } } },
			}),
			this.prisma.sale.count({ where }),
		]);
		return {
			items: sales.map((sale) => this.toSummary(sale)),
			page,
			pageSize,
			total,
		};
	}

	async findOrder(tenantId: string, id: string) {
		const sale = await this.prisma.sale.findFirst({
			where: { id, tenantId, channel: 'ORDER', deletedAt: null },
			include: {
				lines: { include: { unit: { select: { id: true, name: true } } } },
			},
		});
		if (!sale) throw new NotFoundException('Sales order not found');
		return this.toOrderDetail(sale);
	}

	private async findOrderInTransaction(
		tx: Prisma.TransactionClient,
		tenantId: string,
		id: string,
	) {
		const sale = await tx.sale.findFirst({
			where: { id, tenantId, channel: 'ORDER', deletedAt: null },
			include: {
				lines: { include: { unit: { select: { id: true, name: true } } } },
			},
		});
		if (!sale) throw new NotFoundException('Sales order not found');
		return this.toOrderDetail(sale);
	}

	private normalizeOrderSettlement(
		status: SalesOrderCreateStatus,
		paymentMethod: SalesOrderPaymentMethod | undefined,
		amountPaid: number | undefined,
		total: bigint,
	): NormalizedOrderSettlement {
		if (status === SalesOrderCreateStatus.DRAFT) {
			if (paymentMethod !== undefined || amountPaid !== undefined)
				throw new UnprocessableEntityException({
					reason: 'DRAFT_SETTLEMENT_FORBIDDEN',
				});
			return {
				paymentMethod: null,
				amountPaid: 0n,
				changeAmount: 0n,
				debtAmount: 0n,
			};
		}
		if (paymentMethod === undefined || amountPaid === undefined)
			throw new UnprocessableEntityException({ reason: 'INVALID_PAYMENT' });
		const rawPaid = BigInt(amountPaid);
		if (paymentMethod === SalesOrderPaymentMethod.DEBT && rawPaid !== 0n)
			throw new UnprocessableEntityException({ reason: 'INVALID_PAYMENT' });
		if (paymentMethod !== SalesOrderPaymentMethod.CASH && rawPaid > total)
			throw new UnprocessableEntityException({ reason: 'INVALID_PAYMENT' });
		return {
			paymentMethod:
				paymentMethod === SalesOrderPaymentMethod.DEBT ? null : paymentMethod,
			amountPaid: rawPaid > total ? total : rawPaid,
			changeAmount:
				paymentMethod === SalesOrderPaymentMethod.CASH && rawPaid > total
					? rawPaid - total
					: 0n,
			debtAmount: rawPaid < total ? total - rawPaid : 0n,
		};
	}

	private matchesOrderRequest(
		existing: OrderWithLines,
		dto: CreateSalesOrderDto,
		settlement: NormalizedOrderSettlement,
	) {
		const canonicalRequested = dto.lines
			.map((line) =>
				[
					line.productId,
					line.unitId,
					new Prisma.Decimal(line.qty).toString(),
					BigInt(line.unitPrice).toString(),
				].join(':'),
			)
			.sort();
		const canonicalStored = existing.lines
			.map((line) =>
				[
					line.productId,
					line.unitId,
					line.qty.toString(),
					line.unitPrice.toString(),
				].join(':'),
			)
			.sort();
		return (
			existing.channel === 'ORDER' &&
			existing.status === dto.status &&
			existing.customerId === (dto.customerId ?? null) &&
			existing.discountAmount === BigInt(dto.discountAmount) &&
			(existing.note ?? null) === (dto.note ?? null) &&
			existing.paymentMethod === settlement.paymentMethod &&
			existing.amountPaid === settlement.amountPaid &&
			existing.changeAmount === settlement.changeAmount &&
			existing.debtAmount === settlement.debtAmount &&
			JSON.stringify(canonicalStored) === JSON.stringify(canonicalRequested)
		);
	}

	private toSummary(sale: OrderSummaryRecord) {
		return {
			id: sale.id,
			docNo: sale.docNo,
			status: sale.status,
			customerName: sale.customerNameSnapshot,
			customerPhone: sale.customerPhoneSnapshot,
			itemCount: sale._count?.lines ?? 0,
			total: this.toSafeMoney(sale.total, 'total'),
			paymentMethod: sale.paymentMethod,
			soldAt: sale.soldAt,
			createdAt: sale.createdAt,
		};
	}

	private toOrderDetail(sale: OrderDetailRecord) {
		return {
			id: sale.id,
			docNo: sale.docNo,
			channel: sale.channel,
			status: sale.status,
			customer: sale.customerId
				? {
						id: sale.customerId,
						name: sale.customerNameSnapshot,
						phone: sale.customerPhoneSnapshot,
					}
				: null,
			warehouseId: sale.warehouseId,
			subtotal: this.toSafeMoney(sale.subtotal, 'subtotal'),
			discountAmount: this.toSafeMoney(sale.discountAmount, 'discountAmount'),
			total: this.toSafeMoney(sale.total, 'total'),
			amountPaid: this.toSafeMoney(sale.amountPaid, 'amountPaid'),
			changeAmount: this.toSafeMoney(sale.changeAmount, 'changeAmount'),
			debtAmount: this.toSafeMoney(sale.debtAmount, 'debtAmount'),
			paymentMethod:
				sale.paymentMethod ?? (sale.debtAmount > 0n ? 'DEBT' : null),
			note: sale.note,
			soldAt: sale.soldAt,
			completedAt: sale.completedAt,
			createdAt: sale.createdAt,
			updatedAt: sale.updatedAt,
			lines: sale.lines.map((line) => ({
				id: line.id,
				productId: line.productId,
				productName: line.productNameSnapshot,
				unitId: line.unitId,
				unitName: line.unit?.name ?? null,
				qty: line.qty.toString(),
				qtyBase: line.qtyBase.toString(),
				unitPrice: this.toSafeMoney(line.unitPrice, 'line.unitPrice'),
				lineTotal: this.toSafeMoney(line.lineTotal, 'line.lineTotal'),
			})),
		};
	}

	private toSafeMoney(value: bigint, field: string) {
		const numberValue = Number(value);
		if (!Number.isSafeInteger(numberValue))
			throw new InternalServerErrorException({
				reason: 'UNSAFE_PERSISTED_MONEY',
				field,
			});
		return numberValue;
	}

	private inputMoney(value: Prisma.Decimal, field: string) {
		if (
			!value.isInteger() ||
			value.isNegative() ||
			value.greaterThan(Number.MAX_SAFE_INTEGER)
		)
			throw new UnprocessableEntityException({
				reason: 'MONEY_OUT_OF_RANGE',
				field,
			});
		return BigInt(value.toFixed(0));
	}

	private positiveStorageQuantity(value: Prisma.Decimal, field: string) {
		if (
			!value.greaterThan(0) ||
			value.decimalPlaces() > 6 ||
			value.greaterThanOrEqualTo('1000000000000')
		)
			throw new UnprocessableEntityException({
				reason: 'INVALID_QUANTITY',
				field,
			});
		return value;
	}

	private async withSerializableRetry<T>(
		operation: (tx: Prisma.TransactionClient) => Promise<T>,
		isAdditionalRetryable: (error: unknown) => boolean = () => false,
		conflictReason = 'SERIALIZATION_CONFLICT',
	) {
		for (let attempt = 0; attempt < 3; attempt += 1) {
			try {
				return await this.prisma.$transaction(operation, {
					isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
				});
			} catch (error) {
				const retryable =
					error instanceof Prisma.PrismaClientKnownRequestError &&
					error.code === 'P2034';
				if (!retryable && !isAdditionalRetryable(error)) throw error;
				if (attempt === 2)
					throw new ConflictException({ reason: conflictReason });
			}
		}
		throw new ConflictException({ reason: conflictReason });
	}

	private isSaleIdempotencyCollision(error: unknown) {
		if (
			!(error instanceof Prisma.PrismaClientKnownRequestError) ||
			error.code !== 'P2002'
		)
			return false;
		const target = error.meta?.target;
		const fields = Array.isArray(target)
			? target.map(String)
			: [String(target)];
		const joined = fields.join(':').toLowerCase();
		return joined.includes('tenantid') && joined.includes('idempotencykey');
	}

	async createOrder(
		tenantId: string,
		userId: string,
		dto: CreateSalesOrderDto,
	) {
		return this.withSerializableRetry(
			async (tx) => {
				const existing = await tx.sale.findFirst({
					where: { tenantId, idempotencyKey: dto.idempotencyKey },
					include: {
						lines: {
							include: { unit: { select: { id: true, name: true } } },
						},
					},
				});
				if (existing) {
					const settlement = this.normalizeOrderSettlement(
						dto.status,
						dto.paymentMethod,
						dto.amountPaid,
						existing.total,
					);
					if (
						existing.channel !== 'ORDER' ||
						!this.matchesOrderRequest(existing, dto, settlement)
					)
						throw new ConflictException({ reason: 'IDEMPOTENCY_CONFLICT' });
					return this.findOrderInTransaction(tx, tenantId, existing.id);
				}
				const warehouse = await tx.warehouse.findMany({
					where: { tenantId, isDefault: true, deletedAt: null },
					select: { id: true },
				});
				if (warehouse.length !== 1)
					throw new UnprocessableEntityException({
						reason: 'WAREHOUSE_CONFIGURATION_ERROR',
					});
				const products = await tx.product.findMany({
					where: {
						tenantId,
						id: { in: [...new Set(dto.lines.map((line) => line.productId))] },
						deletedAt: null,
					},
					include: {
						conversions: {
							where: { kind: { in: ['SALE', 'BOTH'] } },
							select: { unitId: true, factorToBase: true },
						},
					},
				});
				const byId = new Map(products.map((product) => [product.id, product]));
				const customer = dto.customerId
					? await tx.customer.findFirst({
							where: { id: dto.customerId, tenantId, deletedAt: null },
						})
					: null;
				if (dto.customerId && !customer)
					throw new UnprocessableEntityException({
						reason: 'INVALID_CUSTOMER',
					});
				const lines = dto.lines.map((line) => {
					const product = byId.get(line.productId);
					if (
						!product ||
						product.status !== 'ACTIVE' ||
						product.isLocked ||
						product.isRecalled
					)
						throw new UnprocessableEntityException({
							reason: 'PRODUCT_UNSELLABLE',
						});
					const factor =
						line.unitId === product.baseUnitId
							? new Prisma.Decimal(1)
							: product.conversions.find((item) => item.unitId === line.unitId)
									?.factorToBase;
					if (!factor)
						throw new UnprocessableEntityException({ reason: 'INVALID_UNIT' });
					const qty = this.positiveStorageQuantity(
						new Prisma.Decimal(line.qty),
						'qty',
					);
					const qtyBase = this.positiveStorageQuantity(
						qty.mul(factor),
						'qtyBase',
					);
					return {
						line,
						product,
						qty,
						qtyBase,
						lineTotal: this.inputMoney(qty.mul(line.unitPrice), 'lineTotal'),
					};
				});
				const subtotal = lines.reduce((sum, item) => sum + item.lineTotal, 0n);
				if (subtotal > BigInt(Number.MAX_SAFE_INTEGER))
					throw new UnprocessableEntityException({
						reason: 'MONEY_OUT_OF_RANGE',
						field: 'subtotal',
					});
				const discount = BigInt(dto.discountAmount);
				if (discount > subtotal)
					throw new UnprocessableEntityException({
						reason: 'INVALID_DISCOUNT',
					});
				const total = subtotal - discount;
				const settlement = this.normalizeOrderSettlement(
					dto.status,
					dto.paymentMethod,
					dto.amountPaid,
					total,
				);
				if (settlement.debtAmount > 0n && !customer)
					throw new UnprocessableEntityException({
						reason: 'INVALID_CUSTOMER',
					});
				const sale = await tx.sale.create({
					data: {
						tenantId,
						docNo: `BH-${randomUUID().slice(0, 8).toUpperCase()}`,
						channel: 'ORDER',
						status: 'DRAFT',
						customerId: customer?.id,
						customerNameSnapshot: customer?.name,
						customerPhoneSnapshot: customer?.phone,
						warehouseId: warehouse[0].id,
						subtotal,
						discountAmount: discount,
						total,
						amountPaid: 0n,
						debtAmount: 0n,
						note: dto.note,
						idempotencyKey: dto.idempotencyKey,
						createdBy: userId,
						lines: {
							create: lines.map((item) => ({
								tenantId,
								productId: item.line.productId,
								productNameSnapshot: item.product.name,
								unitId: item.line.unitId,
								qty: item.qty,
								qtyBase: item.qtyBase,
								unitPrice: item.line.unitPrice,
								lineTotal: item.lineTotal,
								unitCost: item.product.costPrice,
							})),
						},
					},
					include: {
						lines: {
							include: { unit: { select: { id: true, name: true } } },
						},
					},
				});
				if (dto.status === SalesOrderCreateStatus.COMPLETED)
					return this.completeInTransaction(
						tx,
						tenantId,
						userId,
						sale.id,
						dto.paymentMethod!,
						Number(dto.amountPaid ?? 0),
						settlement,
					);
				return this.toOrderDetail(sale);
			},
			(error) => this.isSaleIdempotencyCollision(error),
		);
	}

	async completeOrder(
		tenantId: string,
		userId: string,
		id: string,
		dto: CompleteSalesOrderDto,
	) {
		return this.withSerializableRetry(
			(tx) =>
				this.completeInTransaction(
					tx,
					tenantId,
					userId,
					id,
					dto.paymentMethod,
					dto.amountPaid,
				),
			undefined,
			'SERIALIZATION_CONFLICT',
		);
	}

	private async completeInTransaction(
		tx: Prisma.TransactionClient,
		tenantId: string,
		userId: string,
		id: string,
		method: SalesOrderPaymentMethod,
		paid: number,
		prevalidatedSettlement?: NormalizedOrderSettlement,
	) {
		const sale = await tx.sale.findFirst({
			where: { id, tenantId, channel: 'ORDER', deletedAt: null },
			include: {
				lines: {
					include: { product: { select: { productKind: true } } },
				},
			},
		});
		if (!sale) throw new NotFoundException('Sales order not found');
		if (sale.status === 'COMPLETED')
			return this.findOrderInTransaction(tx, tenantId, id);
		if (sale.status !== 'DRAFT')
			throw new ConflictException({ reason: 'INVALID_STATE' });
		const total = BigInt(sale.total);
		const settlement =
			prevalidatedSettlement ??
			this.normalizeOrderSettlement(
				SalesOrderCreateStatus.COMPLETED,
				method,
				paid,
				total,
			);
		if (settlement.debtAmount > 0n && !sale.customerId)
			throw new UnprocessableEntityException({ reason: 'INVALID_CUSTOMER' });
		await this.entitlements.assertFeature(tenantId, 'inventory', tx);
		if (settlement.debtAmount > 0n)
			await this.entitlements.assertFeature(tenantId, 'debt', tx);
		for (const line of sale.lines) {
			const qtyBase = this.positiveStorageQuantity(line.qtyBase, 'qtyBase');
			const allocations = await resolveSaleAllocations(tx, {
				tenantId,
				warehouseId: sale.warehouseId,
				productId: line.productId,
				qtyBase,
				productKind: line.product?.productKind,
			});
			if (allocations.length > 0) {
				await tx.saleLineBatch.createMany({
					data: allocations.map((allocation) => ({
						saleLineId: line.id,
						batchId: allocation.batchId,
						qtyBase: allocation.qtyBase,
					})),
				});
			}
			const stock = await tx.stock.findFirst({
				where: {
					tenantId,
					warehouseId: sale.warehouseId,
					productId: line.productId,
				},
			});
			if (!stock) throw this.insufficientStock();
			const updated = await tx.stock.updateMany({
				where: { id: stock.id, tenantId, qty: { gte: qtyBase } },
				data: { qty: { decrement: qtyBase } },
			});
			if (updated.count !== 1) throw this.insufficientStock();
			for (const allocation of allocations.length > 0
				? allocations
				: [{ batchId: undefined, qtyBase }]) {
				await tx.stockMovement.create({
					data: {
						tenantId,
						warehouseId: sale.warehouseId,
						productId: line.productId,
						batchId: allocation.batchId,
						direction: 'OUT',
						qty: allocation.qtyBase,
						reason: 'SALE',
						refType: 'SALE',
						refId: sale.id,
						refLineId: line.id,
						createdBy: userId,
					},
				});
			}
		}
		if (settlement.debtAmount > 0n) {
			const customerUpdated = await tx.customer.updateMany({
				where: { id: sale.customerId!, tenantId, deletedAt: null },
				data: { balance: { increment: settlement.debtAmount } },
			});
			if (customerUpdated.count !== 1)
				throw new ConflictException({ reason: 'CONCURRENT_MODIFICATION' });
			const customer = await tx.customer.findFirst({
				where: { id: sale.customerId!, tenantId, deletedAt: null },
				select: { balance: true },
			});
			if (!customer)
				throw new ConflictException({ reason: 'CONCURRENT_MODIFICATION' });
			await tx.debtLedger.create({
				data: {
					tenantId,
					partyType: 'CUSTOMER',
					partyId: sale.customerId!,
					entryType: 'SALE',
					direction: 'INCREASE',
					amount: settlement.debtAmount,
					balanceAfter: customer.balance,
					refType: 'SALE',
					refId: sale.id,
					createdBy: userId,
				},
			});
		}
		const terminal = await tx.sale.updateMany({
			where: {
				id: sale.id,
				tenantId,
				channel: 'ORDER',
				status: 'DRAFT',
				deletedAt: null,
			},
			data: {
				status: 'COMPLETED',
				amountPaid: settlement.amountPaid,
				changeAmount: settlement.changeAmount,
				debtAmount: settlement.debtAmount,
				paymentMethod: settlement.paymentMethod,
				completedAt: new Date(),
			},
		});
		if (terminal.count !== 1)
			throw new ConflictException({ reason: 'CONCURRENT_MODIFICATION' });
		return this.findOrderInTransaction(tx, tenantId, id);
	}

	async cancelOrder(tenantId: string, userId: string, id: string) {
		let sourceStatus: 'DRAFT' | 'COMPLETED' | undefined;
		return this.withSerializableRetry(
			(tx) =>
				this.cancelInTransaction(
					tx,
					tenantId,
					userId,
					id,
					sourceStatus,
					(status) => {
						sourceStatus ??= status;
					},
				),
			undefined,
			'SERIALIZATION_CONFLICT',
		);
	}

	private async cancelInTransaction(
		tx: Prisma.TransactionClient,
		tenantId: string,
		userId: string,
		id: string,
		expectedSourceStatus: 'DRAFT' | 'COMPLETED' | undefined,
		recordSourceStatus: (status: 'DRAFT' | 'COMPLETED') => void,
	) {
		const sale = await tx.sale.findFirst({
			where: { id, tenantId, channel: 'ORDER', deletedAt: null },
			include: {
				lines: { include: { unit: { select: { id: true, name: true } } } },
			},
		});
		if (!sale) throw new NotFoundException('Sales order not found');
		if (sale.status === 'CANCELLED')
			return this.findOrderInTransaction(tx, tenantId, id);
		if (sale.status !== 'DRAFT' && sale.status !== 'COMPLETED')
			throw new ConflictException({ reason: 'INVALID_STATE' });
		if (expectedSourceStatus && sale.status !== expectedSourceStatus)
			throw new ConflictException({ reason: 'CONCURRENT_MODIFICATION' });
		recordSourceStatus(sale.status);

		if (sale.status === 'COMPLETED') {
			const completedReturn = await tx.salesReturn.findFirst({
				where: {
					tenantId,
					originalSaleId: sale.id,
					status: 'COMPLETED',
				},
				select: { id: true },
			});
			if (completedReturn)
				throw new ConflictException({ reason: 'SALE_ALREADY_RETURNED' });

			await this.entitlements.assertFeature(tenantId, 'inventory', tx);
			if (sale.debtAmount > 0n)
				await this.entitlements.assertFeature(tenantId, 'debt', tx);

			const cancellationLines = sale.lines.map((line) => ({
				...line,
				qtyBase: this.positiveStorageQuantity(line.qtyBase, 'qtyBase'),
			}));
			for (const line of cancellationLines) {
				const stock = await tx.stock.findFirst({
					where: {
						tenantId,
						warehouseId: sale.warehouseId,
						productId: line.productId,
					},
					select: { id: true },
				});
				if (!stock)
					throw new ConflictException({
						reason: 'STOCK_COMPENSATION_CONFLICT',
					});
				const stockUpdated = await tx.stock.updateMany({
					where: { id: stock.id, tenantId },
					data: { qty: { increment: line.qtyBase } },
				});
				if (stockUpdated.count !== 1)
					throw new ConflictException({
						reason: 'STOCK_COMPENSATION_CONFLICT',
					});
				await tx.stockMovement.create({
					data: {
						tenantId,
						warehouseId: sale.warehouseId,
						productId: line.productId,
						direction: 'IN',
						qty: line.qtyBase,
						reason: 'SALE_CANCEL',
						refType: 'SALE_CANCEL',
						refId: sale.id,
						refLineId: line.id,
						createdBy: userId,
					},
				});
			}

			if (sale.debtAmount > 0n) {
				if (!sale.customerId)
					throw new ConflictException({ reason: 'DEBT_COMPENSATION_CONFLICT' });
				const customerUpdated = await tx.customer.updateMany({
					where: {
						id: sale.customerId,
						tenantId,
						deletedAt: null,
						balance: { gte: sale.debtAmount },
					},
					data: { balance: { decrement: sale.debtAmount } },
				});
				if (customerUpdated.count !== 1)
					throw new ConflictException({ reason: 'DEBT_COMPENSATION_CONFLICT' });
				const customer = await tx.customer.findFirst({
					where: { id: sale.customerId, tenantId, deletedAt: null },
					select: { balance: true },
				});
				if (!customer)
					throw new ConflictException({ reason: 'DEBT_COMPENSATION_CONFLICT' });
				await tx.debtLedger.create({
					data: {
						tenantId,
						partyType: 'CUSTOMER',
						partyId: sale.customerId,
						entryType: 'ADJUST',
						direction: 'DECREASE',
						amount: sale.debtAmount,
						balanceAfter: customer.balance,
						refType: 'SALE_CANCEL',
						refId: sale.id,
						createdBy: userId,
					},
				});
			}
		}

		const terminal = await tx.sale.updateMany({
			where: {
				id: sale.id,
				tenantId,
				channel: 'ORDER',
				status: sale.status,
				deletedAt: null,
			},
			data: { status: 'CANCELLED' },
		});
		if (terminal.count !== 1)
			throw new ConflictException({ reason: 'CONCURRENT_MODIFICATION' });
		return this.findOrderInTransaction(tx, tenantId, id);
	}

	async createQuickSale(
		tenantId: string,
		userId: string,
		dto: CreateQuickSaleDto,
	): Promise<QuickSaleResponse> {
		return this.withSerializableRetry(
			async (tx) => {
				const normalized = this.normalize(dto);
				const existing = await tx.sale.findFirst({
					where: { tenantId, idempotencyKey: dto.idempotencyKey },
					include: { lines: true },
				});
				if (existing) {
					if (!this.matchesExisting(existing, dto, normalized)) {
						throw new ConflictException({
							reason: 'IDEMPOTENCY_CONFLICT',
							message: 'Idempotency key was already used for another sale',
						});
					}
					return this.toResponse(existing, dto.paymentMethod);
				}

				const warehouse = await tx.warehouse.findMany({
					where: { tenantId, isDefault: true, deletedAt: null },
					select: { id: true },
				});
				if (warehouse.length !== 1) {
					throw new UnprocessableEntityException({
						reason: 'WAREHOUSE_CONFIGURATION_ERROR',
						message: 'Exactly one default warehouse is required',
					});
				}

				const products = await tx.product.findMany({
					where: {
						tenantId,
						id: { in: [...new Set(normalized.map((line) => line.productId))] },
						deletedAt: null,
					},
					include: {
						baseUnit: { select: { id: true } },
						conversions: {
							where: { kind: { in: ['SALE', 'BOTH'] } },
							select: { unitId: true, factorToBase: true },
						},
					},
				});
				const productById = new Map(
					products.map((product) => [product.id, product]),
				);
				const customer = dto.customerId
					? await tx.customer.findFirst({
							where: { id: dto.customerId, tenantId, deletedAt: null },
						})
					: null;
				if (dto.customerId && !customer) {
					throw new UnprocessableEntityException({
						reason: 'INVALID_CUSTOMER',
						message: 'Customer does not belong to this tenant',
					});
				}

				const prepared = normalized.map((line) => {
					const product = productById.get(line.productId);
					if (
						!product ||
						product.isLocked ||
						product.isRecalled ||
						product.status !== 'ACTIVE'
					) {
						throw new UnprocessableEntityException({
							reason: 'PRODUCT_UNSELLABLE',
							message: 'Product is missing, inactive, locked, or recalled',
						});
					}
					const factor =
						line.unitId === product.baseUnitId
							? new Prisma.Decimal(1)
							: product.conversions.find(
									(conversion) => conversion.unitId === line.unitId,
								)?.factorToBase;
					if (!factor) {
						throw new UnprocessableEntityException({
							reason: 'VALIDATION_ERROR',
							message: 'Unit is not valid for this product',
						});
					}
					const qtyBase = this.positiveStorageQuantity(
						new Prisma.Decimal(line.qty).mul(factor),
						'qtyBase',
					);
					return {
						...line,
						product,
						qtyBase,
						lineTotal: this.inputMoney(
							new Prisma.Decimal(line.unitPrice.toString()).mul(line.qty),
							'lineTotal',
						),
					};
				});

				const subtotal = prepared.reduce(
					(sum, line) => sum + line.lineTotal,
					0n,
				);
				if (subtotal > BigInt(Number.MAX_SAFE_INTEGER))
					throw new UnprocessableEntityException({
						reason: 'MONEY_OUT_OF_RANGE',
						field: 'subtotal',
					});
				const discountAmount = BigInt(dto.discountAmount);
				if (discountAmount > subtotal) {
					throw new UnprocessableEntityException({
						reason: 'VALIDATION_ERROR',
						message: 'Discount cannot exceed subtotal',
					});
				}
				const total = subtotal - discountAmount;
				const amountPaid = BigInt(dto.amountPaid);
				if (
					dto.paymentMethod === QuickSalePaymentMethod.DEBT &&
					amountPaid !== 0n
				) {
					throw new UnprocessableEntityException({
						reason: 'VALIDATION_ERROR',
						message: 'Debt payment must have zero amount paid',
					});
				}
				if (
					amountPaid > total &&
					dto.paymentMethod !== QuickSalePaymentMethod.CASH
				) {
					throw new UnprocessableEntityException({
						reason: 'VALIDATION_ERROR',
						message: 'Only cash payment can include change',
					});
				}
				const debtAmount = amountPaid < total ? total - amountPaid : 0n;
				if (debtAmount > 0n && !customer) {
					throw new UnprocessableEntityException({
						reason: 'INVALID_CUSTOMER',
						message: 'A customer is required for unpaid sales',
					});
				}

				const allocationsByLine = new Map<
					(typeof prepared)[number],
					Awaited<ReturnType<typeof resolveSaleAllocations>>
				>();
				for (const line of prepared) {
					const allocations = await resolveSaleAllocations(tx, {
						tenantId,
						warehouseId: warehouse[0].id,
						productId: line.productId,
						qtyBase: line.qtyBase,
						productKind: line.product.productKind,
					});
					allocationsByLine.set(line, allocations);
					const stock = await tx.stock.findFirst({
						where: {
							tenantId,
							warehouseId: warehouse[0].id,
							productId: line.productId,
						},
						select: { id: true },
					});
					if (!stock) throw this.insufficientStock();
					const updated = await tx.stock.updateMany({
						where: {
							id: stock.id,
							tenantId,
							qty: { gte: line.qtyBase },
						},
						data: { qty: { decrement: line.qtyBase } },
					});
					if (updated.count !== 1) throw this.insufficientStock();
				}

				const sale = await tx.sale.create({
					data: {
						tenantId,
						docNo: `BH-${randomUUID().slice(0, 8).toUpperCase()}`,
						channel: 'QUICK_SALE',
						status: 'COMPLETED',
						customerId: customer?.id,
						customerNameSnapshot: customer?.name,
						customerPhoneSnapshot: customer?.phone,
						warehouseId: warehouse[0].id,
						subtotal,
						discountAmount,
						total,
						amountPaid: amountPaid > total ? total : amountPaid,
						changeAmount: amountPaid > total ? amountPaid - total : 0n,
						debtAmount,
						paymentMethod: this.toPrismaPayment(dto.paymentMethod),
						idempotencyKey: dto.idempotencyKey,
						createdBy: userId,
						completedAt: new Date(),
						lines: {
							create: prepared.map((line) => ({
								tenantId,
								productId: line.productId,
								productNameSnapshot: line.product.name,
								unitId: line.unitId,
								qty: line.qty,
								qtyBase: line.qtyBase,
								unitPrice: line.unitPrice,
								priceSource: 'MANUAL',
								lineTotal: line.lineTotal,
								unitCost: line.product.costPrice,
							})),
						},
					},
					include: { lines: true },
				});

				for (const [index, line] of prepared.entries()) {
					const allocations = allocationsByLine.get(line) ?? [];
					if (allocations.length > 0) {
						await tx.saleLineBatch.createMany({
							data: allocations.map((allocation) => ({
								saleLineId: sale.lines[index].id,
								batchId: allocation.batchId,
								qtyBase: allocation.qtyBase,
							})),
						});
					}
					for (const allocation of allocations.length > 0
						? allocations
						: [{ batchId: undefined, qtyBase: line.qtyBase }]) {
						await tx.stockMovement.create({
							data: {
								tenantId,
								warehouseId: warehouse[0].id,
								productId: line.productId,
								batchId: allocation.batchId,
								direction: 'OUT',
								qty: allocation.qtyBase,
								reason: 'SALE',
								refType: 'SALE',
								refId: sale.id,
								createdBy: userId,
							},
						});
					}
				}

				if (customer && debtAmount > 0n) {
					const updatedCustomer = await tx.customer.update({
						where: { id: customer.id },
						data: { balance: { increment: debtAmount } },
						select: { balance: true },
					});
					await tx.debtLedger.create({
						data: {
							tenantId,
							partyType: 'CUSTOMER',
							partyId: customer.id,
							entryType: 'SALE',
							direction: 'INCREASE',
							amount: debtAmount,
							balanceAfter: updatedCustomer.balance,
							refType: 'SALE',
							refId: sale.id,
							createdBy: userId,
						},
					});
				}
				return this.toResponse(sale, dto.paymentMethod);
			},
			(error) => this.isSaleIdempotencyCollision(error),
		);
	}

	private normalize(dto: CreateQuickSaleDto): NormalizedLine[] {
		return [...dto.lines]
			.sort((a, b) =>
				`${a.productId}:${a.unitId}`.localeCompare(
					`${b.productId}:${b.unitId}`,
				),
			)
			.map((line) => ({
				productId: line.productId,
				unitId: line.unitId,
				qty: line.qty,
				unitPrice: BigInt(line.unitPrice),
			}));
	}

	private matchesExisting(
		existing: Prisma.SaleGetPayload<{ include: { lines: true } }>,
		dto: CreateQuickSaleDto,
		lines: NormalizedLine[],
	) {
		const canonicalExistingLines = existing.lines
			.map((line) =>
				[
					line.productId,
					line.unitId,
					line.qty.toString(),
					line.unitPrice.toString(),
				].join(':'),
			)
			.sort();
		const canonicalRequestedLines = lines
			.map((line) =>
				[
					line.productId,
					line.unitId,
					new Prisma.Decimal(line.qty).toString(),
					line.unitPrice.toString(),
				].join(':'),
			)
			.sort();
		const payment = this.toPrismaPayment(dto.paymentMethod);
		const requestedPaid = BigInt(dto.amountPaid);
		return (
			existing.channel === 'QUICK_SALE' &&
			existing.status === 'COMPLETED' &&
			existing.customerId === (dto.customerId ?? null) &&
			existing.discountAmount === BigInt(dto.discountAmount) &&
			existing.amountPaid ===
				(requestedPaid > existing.total ? existing.total : requestedPaid) &&
			existing.paymentMethod === payment &&
			existing.changeAmount ===
				(dto.paymentMethod === QuickSalePaymentMethod.CASH &&
				requestedPaid > existing.total
					? requestedPaid - existing.total
					: 0n) &&
			existing.debtAmount ===
				(requestedPaid < existing.total
					? existing.total - requestedPaid
					: 0n) &&
			JSON.stringify(canonicalExistingLines) ===
				JSON.stringify(canonicalRequestedLines)
		);
	}

	private toPrismaPayment(method: QuickSalePaymentMethod) {
		if (method === QuickSalePaymentMethod.TRANSFER)
			return 'BANK_TRANSFER' as const;
		if (method === QuickSalePaymentMethod.QR) return 'QR' as const;
		if (method === QuickSalePaymentMethod.CASH) return 'CASH' as const;
		return null;
	}

	private toResponse(
		sale: Prisma.SaleGetPayload<{ include: { lines: true } }>,
		paymentMethod: QuickSalePaymentMethod,
	): QuickSaleResponse {
		return {
			id: sale.id,
			docNo: sale.docNo,
			status: 'COMPLETED',
			subtotal: this.toSafeMoney(sale.subtotal, 'subtotal'),
			discountAmount: this.toSafeMoney(sale.discountAmount, 'discountAmount'),
			total: this.toSafeMoney(sale.total, 'total'),
			amountPaid: this.toSafeMoney(sale.amountPaid, 'amountPaid'),
			changeAmount: this.toSafeMoney(sale.changeAmount, 'changeAmount'),
			debtAmount: this.toSafeMoney(sale.debtAmount, 'debtAmount'),
			paymentMethod,
			lines: sale.lines.map((line) => ({
				productId: line.productId,
				qty: Number(line.qty),
				qtyBase: Number(line.qtyBase),
				unitPrice: this.toSafeMoney(line.unitPrice, 'line.unitPrice'),
				lineTotal: this.toSafeMoney(line.lineTotal, 'line.lineTotal'),
			})),
		};
	}

	private insufficientStock() {
		return new UnprocessableEntityException({
			reason: 'INSUFFICIENT_STOCK',
			message: 'Insufficient stock for one or more products',
		});
	}
}
