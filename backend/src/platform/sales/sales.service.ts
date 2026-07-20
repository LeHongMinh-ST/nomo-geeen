import { randomUUID } from 'node:crypto';
import {
	ConflictException,
	Injectable,
	UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateQuickSaleDto } from './dto/create-quick-sale.dto';
import { QuickSalePaymentMethod } from './dto/create-quick-sale.dto';

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

@Injectable()
export class SalesService {
	constructor(private readonly prisma: PrismaService) {}

	async createQuickSale(
		tenantId: string,
		userId: string,
		dto: CreateQuickSaleDto,
	): Promise<QuickSaleResponse> {
		return this.prisma.$transaction(async (tx) => {
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
				const qtyBase = new Prisma.Decimal(line.qty).mul(factor);
				return {
					...line,
					product,
					qtyBase,
					lineTotal: line.unitPrice * BigInt(line.qty),
				};
			});

			const subtotal = prepared.reduce((sum, line) => sum + line.lineTotal, 0n);
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

			for (const line of prepared) {
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
					where: { id: stock.id, qty: { gte: line.qtyBase } },
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

			for (const line of prepared) {
				await tx.stockMovement.create({
					data: {
						tenantId,
						warehouseId: warehouse[0].id,
						productId: line.productId,
						direction: 'OUT',
						qty: line.qtyBase,
						reason: 'SALE',
						refType: 'SALE',
						refId: sale.id,
						createdBy: userId,
					},
				});
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
		});
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
		const existingLines = [...existing.lines]
			.sort((a, b) =>
				`${a.productId}:${a.unitId}`.localeCompare(
					`${b.productId}:${b.unitId}`,
				),
			)
			.map((line) => ({
				productId: line.productId,
				unitId: line.unitId,
				qty: Number(line.qty),
				unitPrice: line.unitPrice.toString(),
			}));
		const requestedLines = lines.map((line) => ({
			...line,
			unitPrice: line.unitPrice.toString(),
		}));
		const payment = this.toPrismaPayment(dto.paymentMethod);
		return (
			existing.customerId === (dto.customerId ?? null) &&
			existing.discountAmount === BigInt(dto.discountAmount) &&
			existing.amountPaid ===
				(BigInt(dto.amountPaid) > existing.total
					? existing.total
					: BigInt(dto.amountPaid)) &&
			existing.paymentMethod === payment &&
			JSON.stringify(existingLines) === JSON.stringify(requestedLines)
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
			subtotal: Number(sale.subtotal),
			discountAmount: Number(sale.discountAmount),
			total: Number(sale.total),
			amountPaid: Number(sale.amountPaid),
			changeAmount: Number(sale.changeAmount),
			debtAmount: Number(sale.debtAmount),
			paymentMethod,
			lines: sale.lines.map((line) => ({
				productId: line.productId,
				qty: Number(line.qty),
				qtyBase: Number(line.qtyBase),
				unitPrice: Number(line.unitPrice),
				lineTotal: Number(line.lineTotal),
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
