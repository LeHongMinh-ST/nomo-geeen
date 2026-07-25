import { randomUUID } from 'node:crypto';
import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type Tx = Prisma.TransactionClient;

/** Stable synthetic party required by the ledger schema for walk-in cash sales. */
export const WALK_IN_PARTY_ID = 'SYSTEM_WALK_IN';

export type RefundPartyType = 'CUSTOMER' | 'SUPPLIER';
export type RefundMethod = 'CASH' | 'BANK_TRANSFER' | 'QR';

/**
 * Refund direction is the inverse of debt settlement: money leaves the shop for a
 * CUSTOMER (sales return) and enters for a SUPPLIER (purchase return). This pairing is
 * unreachable through DebtsService, which is why prior refunds can be summed safely.
 */
const REFUND_DIRECTION = {
	CUSTOMER: {
		voucherType: 'PAYMENT',
		docPrefix: 'RFS',
		refType: 'SALE_RETURN_REFUND',
	},
	SUPPLIER: {
		voucherType: 'RECEIPT',
		docPrefix: 'RFP',
		refType: 'PURCHASE_RETURN_REFUND',
	},
} as const;

export function parseRefundMethod(requested?: string): RefundMethod {
	if (
		requested === 'CASH' ||
		requested === 'BANK_TRANSFER' ||
		requested === 'QR'
	) {
		return requested;
	}
	return 'CASH';
}

/** paidCap = amountPaid − prior refunds; capped by the economic share of this return. */
export function resolveRefundCap(
	amountPaid: bigint,
	priorRefunded: bigint,
	returnTotal: bigint,
): bigint {
	const paidCap = amountPaid - priorRefunded;
	if (paidCap <= 0n) return 0n;
	return paidCap < returnTotal ? paidCap : returnTotal;
}

export function resolveRefundAmount(
	requested: string | null | undefined,
	cap: bigint,
): bigint {
	if (cap <= 0n) throw new ConflictException({ reason: 'REFUND_EXCEEDS_PAID' });
	if (requested === undefined || requested === null || requested === '') {
		return cap;
	}
	let parsed: bigint;
	try {
		parsed = BigInt(requested);
	} catch {
		throw new ConflictException({ reason: 'REFUND_AMOUNT_INVALID' });
	}
	if (parsed <= 0n)
		throw new ConflictException({ reason: 'REFUND_AMOUNT_INVALID' });
	if (parsed > cap)
		throw new ConflictException({ reason: 'REFUND_EXCEEDS_PAID' });
	return parsed;
}

/** Sum of refunds already issued against the original document. */
export async function sumPriorRefunds(
	tx: Tx,
	tenantId: string,
	partyType: RefundPartyType,
	originalId: string,
): Promise<bigint> {
	const where =
		partyType === 'CUSTOMER'
			? { tenantId, refSaleId: originalId, voucherType: 'PAYMENT' as const }
			: {
					tenantId,
					refPurchaseId: originalId,
					voucherType: 'RECEIPT' as const,
				};
	const agg = await tx.paymentVoucher.aggregate({
		_sum: { amount: true },
		where: { ...where, partyType, status: 'COMPLETED' },
	});
	return agg._sum.amount ?? 0n;
}

export interface RefundVoucherInput {
	tenantId: string;
	userId: string;
	partyType: RefundPartyType;
	partyId: string | null;
	originalId: string;
	returnId: string;
	amount: bigint;
	method: RefundMethod;
	note?: string | null;
}

export interface RefundVoucherResult {
	voucherId: string;
	docNo: string;
	amount: bigint;
	method: RefundMethod;
	partyType: RefundPartyType;
	partyId: string;
}

/**
 * Writes voucher + line + ledger audit row. Party balance is deliberately NOT touched:
 * a refund settles cash already paid, it does not change outstanding debt. The
 * `balanceAfter: null` marker records that no balance was recomputed.
 */
export async function writeRefundVoucher(
	tx: Tx,
	input: RefundVoucherInput,
): Promise<RefundVoucherResult> {
	const partyId = input.partyId ?? WALK_IN_PARTY_ID;

	const direction = REFUND_DIRECTION[input.partyType];
	const docNo = `${direction.docPrefix}-${randomUUID()
		.replace(/-/g, '')
		.slice(0, 16)
		.toUpperCase()}`;

	let voucher: { id: string; docNo: string };
	try {
		voucher = await tx.paymentVoucher.create({
			data: {
				tenantId: input.tenantId,
				docNo,
				idempotencyKey: `refund:${input.returnId}`,
				voucherType: direction.voucherType,
				partyType: input.partyType,
				partyId,
				amount: input.amount,
				method: input.method,
				refSaleId: input.partyType === 'CUSTOMER' ? input.originalId : null,
				refPurchaseId: input.partyType === 'SUPPLIER' ? input.originalId : null,
				customerId:
					input.partyType === 'CUSTOMER' && input.partyId
						? input.partyId
						: null,
				supplierId:
					input.partyType === 'SUPPLIER' && input.partyId
						? input.partyId
						: null,
				note: input.note?.trim() || null,
				createdBy: input.userId,
				status: 'COMPLETED',
				lines: {
					create: [
						{
							method: input.method,
							amount: input.amount,
							refSaleId:
								input.partyType === 'CUSTOMER' ? input.originalId : null,
							refPurchaseId:
								input.partyType === 'SUPPLIER' ? input.originalId : null,
						},
					],
				},
			},
			select: { id: true, docNo: true },
		});
	} catch (error) {
		if (
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === 'P2002' &&
			Array.isArray(error.meta?.target) &&
			error.meta.target.includes('tenantId') &&
			error.meta.target.includes('idempotencyKey')
		) {
			throw new ConflictException({ reason: 'REFUND_ALREADY_APPLIED' });
		}
		throw error;
	}

	await tx.debtLedger.create({
		data: {
			tenantId: input.tenantId,
			partyType: input.partyType,
			partyId,
			entryType: 'ADJUST',
			direction: 'INCREASE',
			amount: input.amount,
			balanceAfter: null,
			refType: direction.refType,
			refId: input.returnId,
			createdBy: input.userId,
		},
	});

	return {
		voucherId: voucher.id,
		docNo: voucher.docNo,
		amount: input.amount,
		method: input.method,
		partyType: input.partyType,
		partyId,
	};
}
