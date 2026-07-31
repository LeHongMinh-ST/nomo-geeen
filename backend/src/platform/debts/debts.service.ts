import { randomUUID } from 'node:crypto';
import {
	ConflictException,
	Injectable,
	NotFoundException,
	UnprocessableEntityException,
} from '@nestjs/common';
import {
	DebtDirection,
	DebtEntryType,
	DebtPartyType,
	VoucherType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
	CreateDebtVoucherDto,
	DebtPartyTypeInput,
	DebtQueryDto,
} from './dto/debt.dto';
import { DebtStatusInput, VoucherTypeInput } from './dto/debt.dto';

const num = (value: bigint | null | undefined) => Number(value ?? 0n);

@Injectable()
export class DebtsService {
	constructor(private readonly prisma: PrismaService) {}
	async list(tenantId: string, query: DebtQueryDto) {
		const partyWhere = {
			tenantId,
			deletedAt: null,
			...(query.search
				? {
						OR: [
							{
								name: { contains: query.search, mode: 'insensitive' as const },
							},
							{ phone: { contains: query.search } },
						],
					}
				: {}),
			...(query.status === DebtStatusInput.OWING
				? { balance: { gt: 0n } }
				: query.status === DebtStatusInput.PAID
					? { balance: { lte: 0n } }
					: {}),
		};
		const start = (query.page - 1) * query.pageSize;
		const includeCustomers = !query.partyType || query.partyType === 'CUSTOMER';
		const includeSuppliers = !query.partyType || query.partyType === 'SUPPLIER';
		const [
			customers,
			suppliers,
			customerCount,
			supplierCount,
			customerTotal,
			supplierTotal,
		] = await Promise.all([
			includeCustomers
				? this.prisma.customer.findMany({
						where: partyWhere,
						orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
						take: start + query.pageSize,
					})
				: Promise.resolve([]),
			includeSuppliers
				? this.prisma.supplier.findMany({
						where: partyWhere,
						orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
						take: start + query.pageSize,
					})
				: Promise.resolve([]),
			includeCustomers
				? this.prisma.customer.count({ where: partyWhere })
				: Promise.resolve(0),
			includeSuppliers
				? this.prisma.supplier.count({ where: partyWhere })
				: Promise.resolve(0),
			includeCustomers
				? this.prisma.customer.aggregate({
						where: partyWhere,
						_sum: { balance: true },
					})
				: Promise.resolve({ _sum: { balance: null } }),
			includeSuppliers
				? this.prisma.supplier.aggregate({
						where: partyWhere,
						_sum: { balance: true },
					})
				: Promise.resolve({ _sum: { balance: null } }),
		]);
		const items = [
			...customers.map((p) => this.summary('CUSTOMER', p)),
			...suppliers.map((p) => this.summary('SUPPLIER', p)),
		]
			.sort((a, b) => {
				const aCreated = a.createdAt?.getTime() ?? null;
				const bCreated = b.createdAt?.getTime() ?? null;
				if (aCreated !== null && bCreated !== null && aCreated !== bCreated) {
					return bCreated - aCreated;
				}
				if (aCreated !== null && bCreated !== null) {
					return b.id.localeCompare(a.id);
				}
				if (aCreated !== null || bCreated !== null) {
					return aCreated === null ? 1 : -1;
				}
				return a.name.localeCompare(b.name) || b.id.localeCompare(a.id);
			})
			.slice(start, start + query.pageSize);
		return {
			items,
			totals: {
				balance:
					num(customerTotal._sum.balance) + num(supplierTotal._sum.balance),
			},
			page: query.page,
			pageSize: query.pageSize,
			total: customerCount + supplierCount,
		};
	}

	async detail(tenantId: string, type: DebtPartyTypeInput, partyId: string) {
		const party =
			type === 'CUSTOMER'
				? await this.prisma.customer.findFirst({
						where: { id: partyId, tenantId, deletedAt: null },
					})
				: await this.prisma.supplier.findFirst({
						where: { id: partyId, tenantId, deletedAt: null },
					});
		if (!party) throw new NotFoundException('Debt party not found');
		const [entries, vouchers] = await Promise.all([
			this.prisma.debtLedger.findMany({
				where: { tenantId, partyType: type, partyId },
				orderBy: { occurredAt: 'desc' },
			}),
			this.prisma.paymentVoucher.findMany({
				where: { tenantId, partyType: type, partyId },
				include: { lines: true },
				orderBy: { occurredAt: 'desc' },
			}),
		]);
		const mapped = this.summary(type, party);
		return {
			party: mapped,
			balance: mapped.balance,
			summary: {
				charged: entries
					.filter(
						(e) =>
							e.direction === DebtDirection.INCREASE &&
							!['SALE_RETURN_REFUND', 'PURCHASE_RETURN_REFUND'].includes(
								e.refType ?? '',
							),
					)
					.reduce((s, e) => s + num(e.amount), 0),
				decreased: entries
					.filter((e) => e.direction === DebtDirection.DECREASE)
					.reduce((s, e) => s + num(e.amount), 0),
			},
			entries: entries.map((e) => ({
				...e,
				amount: num(e.amount),
				balanceAfter: e.balanceAfter === null ? null : num(e.balanceAfter),
			})),
			vouchers: vouchers.map((v) => ({
				...v,
				amount: num(v.amount),
				lines: v.lines.map((l) => ({ ...l, amount: num(l.amount) })),
			})),
		};
	}
	async createVoucher(
		tenantId: string,
		userId: string,
		dto: CreateDebtVoucherDto,
	) {
		if ((dto.partyType === 'CUSTOMER') !== (dto.voucherType === 'RECEIPT'))
			throw new UnprocessableEntityException(
				'Voucher direction does not match party type',
			);
		const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : undefined;
		if (occurredAt && Number.isNaN(occurredAt.getTime()))
			throw new UnprocessableEntityException('Invalid occurredAt');
		return this.prisma.$transaction(async (tx) => {
			const existing = await tx.paymentVoucher.findFirst({
				where: { tenantId, idempotencyKey: dto.idempotencyKey },
				include: { lines: true },
			});
			if (existing) {
				const samePayload =
					existing.partyType === dto.partyType &&
					existing.partyId === dto.partyId &&
					existing.voucherType === dto.voucherType &&
					existing.amount === BigInt(dto.amount) &&
					existing.method === dto.method &&
					(!occurredAt ||
						existing.occurredAt.getTime() === occurredAt.getTime()) &&
					(existing.note ?? null) === (dto.note ?? null);
				if (!samePayload)
					throw new ConflictException(
						'Idempotency key is already used with a different payload',
					);
				const ledger = await tx.debtLedger.findFirst({
					where: { tenantId, refType: 'PAYMENT_VOUCHER', refId: existing.id },
				});
				return this.mapVoucherResult(existing, ledger);
			}
			const type = dto.partyType as DebtPartyType;
			const party =
				type === 'CUSTOMER'
					? await tx.customer.findFirst({
							where: { id: dto.partyId, tenantId, deletedAt: null },
							select: { id: true, balance: true },
						})
					: await tx.supplier.findFirst({
							where: { id: dto.partyId, tenantId, deletedAt: null },
							select: { id: true, balance: true },
						});
			if (!party) throw new NotFoundException('Debt party not found');
			const amount = BigInt(dto.amount);
			if (amount <= 0n || party.balance < amount)
				throw new UnprocessableEntityException(
					'Amount exceeds outstanding debt',
				);
			const changed =
				type === 'CUSTOMER'
					? await tx.customer.updateMany({
							where: { id: party.id, tenantId, balance: { gte: amount } },
							data: { balance: { decrement: amount } },
						})
					: await tx.supplier.updateMany({
							where: { id: party.id, tenantId, balance: { gte: amount } },
							data: { balance: { decrement: amount } },
						});
			if (changed.count !== 1)
				throw new ConflictException('Debt balance changed; retry');
			const allocations: Array<{ saleId: string; amount: bigint }> = [];
			if (type === DebtPartyType.CUSTOMER) {
				const sales = await tx.sale.findMany({
					where: {
						tenantId,
						customerId: dto.partyId,
						status: 'COMPLETED',
						deletedAt: null,
						debtAmount: { gt: 0n },
					},
					orderBy: [{ soldAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
					select: { id: true, debtAmount: true },
				});
				let remaining = amount;
				for (const sale of sales) {
					if (remaining <= 0n) break;
					const allocated =
						remaining < sale.debtAmount ? remaining : sale.debtAmount;
					const saleChanged = await tx.sale.updateMany({
						where: {
							id: sale.id,
							tenantId,
							customerId: dto.partyId,
							status: 'COMPLETED',
							debtAmount: { gte: allocated },
						},
						data: {
							amountPaid: { increment: allocated },
							debtAmount: { decrement: allocated },
						},
					});
					if (saleChanged.count !== 1)
						throw new ConflictException('Sale debt changed; retry');
					allocations.push({ saleId: sale.id, amount: allocated });
					remaining -= allocated;
				}
			}
			const unallocated =
				amount - allocations.reduce((sum, item) => sum + item.amount, 0n);
			const voucher = await tx.paymentVoucher.create({
				data: {
					tenantId,
					docNo: `PT-${randomUUID().slice(0, 8).toUpperCase()}`,
					idempotencyKey: dto.idempotencyKey,
					voucherType: dto.voucherType as VoucherType,
					partyType: type,
					partyId: dto.partyId,
					amount,
					method: dto.method,
					occurredAt,
					note: dto.note,
					createdBy: userId,
					customerId: type === 'CUSTOMER' ? dto.partyId : undefined,
					supplierId: type === 'SUPPLIER' ? dto.partyId : undefined,
					refSaleId:
						unallocated === 0n && allocations.length === 1
							? allocations[0].saleId
							: undefined,
					lines: {
						create: [
							...allocations.map((allocation) => ({
								method: dto.method,
								amount: allocation.amount,
								refSaleId: allocation.saleId,
							})),
							...(unallocated > 0n
								? [{ method: dto.method, amount: unallocated }]
								: []),
						],
					},
				},
			});
			const ledger = await tx.debtLedger.create({
				data: {
					tenantId,
					partyType: type,
					partyId: dto.partyId,
					entryType:
						dto.voucherType === VoucherTypeInput.RECEIPT
							? DebtEntryType.RECEIPT
							: DebtEntryType.PAYMENT,
					direction: DebtDirection.DECREASE,
					amount,
					balanceAfter: party.balance - amount,
					refType: 'PAYMENT_VOUCHER',
					refId: voucher.id,
					occurredAt: voucher.occurredAt,
					note: dto.note,
					createdBy: userId,
				},
			});
			return this.mapVoucherResult(voucher, ledger);
		});
	}
	private mapVoucherResult(
		voucher: {
			id: string;
			amount: bigint;
			occurredAt: Date;
			lines?: Array<{ amount: bigint; [key: string]: unknown }>;
		},
		ledger: {
			amount: bigint;
			balanceAfter: bigint | null;
			[key: string]: unknown;
		} | null,
	) {
		return {
			...voucher,
			amount: num(voucher.amount),
			balanceAfter: ledger ? num(ledger.balanceAfter) : null,
			ledger: ledger
				? {
						...ledger,
						amount: num(ledger.amount),
						balanceAfter: num(ledger.balanceAfter),
					}
				: null,
			lines: voucher.lines?.map((line) => ({
				...line,
				amount: num(line.amount),
			})),
		};
	}
	private summary(
		type: string,
		p: {
			id: string;
			name: string;
			code?: string | null;
			phone?: string | null;
			address?: string | null;
			createdAt?: Date | null;
			balance: bigint;
			openingBalance: bigint;
		},
	) {
		return {
			id: p.id,
			partyType: type,
			code: p.code ?? null,
			name: p.name,
			phone: p.phone ?? null,
			address: p.address ?? null,
			createdAt: p.createdAt ?? null,
			balance: num(p.balance),
			openingBalance: num(p.openingBalance),
		};
	}
}
