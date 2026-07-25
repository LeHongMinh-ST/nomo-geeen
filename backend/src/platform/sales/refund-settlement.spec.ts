import { Prisma } from '@prisma/client';
import {
	parseRefundMethod,
	resolveRefundAmount,
	resolveRefundCap,
	sumPriorRefunds,
	writeRefundVoucher,
} from './refund-settlement';

describe('refund-settlement', () => {
	function txStub() {
		return {
			paymentVoucher: {
				aggregate: jest.fn(),
				create: jest.fn(),
			},
			debtLedger: { create: jest.fn() },
		};
	}

	describe('parseRefundMethod', () => {
		it('defaults to CASH and passes through supported methods', () => {
			expect(parseRefundMethod(undefined)).toBe('CASH');
			expect(parseRefundMethod('WIRE')).toBe('CASH');
			expect(parseRefundMethod('BANK_TRANSFER')).toBe('BANK_TRANSFER');
			expect(parseRefundMethod('QR')).toBe('QR');
		});
	});

	describe('resolveRefundCap', () => {
		it('caps at the economic share of the return', () => {
			expect(resolveRefundCap(1000n, 0n, 300n)).toBe(300n);
		});

		it('caps at unrefunded paid amount when it is the tighter bound', () => {
			expect(resolveRefundCap(1000n, 800n, 300n)).toBe(200n);
		});

		it('returns zero once the paid amount is fully refunded', () => {
			expect(resolveRefundCap(1000n, 1000n, 300n)).toBe(0n);
			expect(resolveRefundCap(0n, 0n, 300n)).toBe(0n);
		});
	});

	describe('resolveRefundAmount', () => {
		it('defaults to the full cap when no amount is requested', () => {
			expect(resolveRefundAmount(undefined, 300n)).toBe(300n);
			expect(resolveRefundAmount(null, 300n)).toBe(300n);
			expect(resolveRefundAmount('', 300n)).toBe(300n);
		});

		it('accepts a partial request under the cap', () => {
			expect(resolveRefundAmount('120', 300n)).toBe(120n);
		});

		it('rejects a request above the cap', () => {
			expect(() => resolveRefundAmount('301', 300n)).toThrow(
				expect.objectContaining({
					response: { reason: 'REFUND_EXCEEDS_PAID' },
				}),
			);
		});

		it('rejects refunds when nothing was paid', () => {
			expect(() => resolveRefundAmount(undefined, 0n)).toThrow(
				expect.objectContaining({
					response: { reason: 'REFUND_EXCEEDS_PAID' },
				}),
			);
		});

		it('rejects non-numeric and non-positive amounts', () => {
			for (const bad of ['abc', '1.5', '0', '-5']) {
				expect(() => resolveRefundAmount(bad, 300n)).toThrow(
					expect.objectContaining({
						response: { reason: 'REFUND_AMOUNT_INVALID' },
					}),
				);
			}
		});
	});

	describe('sumPriorRefunds', () => {
		it('sums customer refunds by PAYMENT vouchers on the sale', async () => {
			const tx = txStub();
			tx.paymentVoucher.aggregate.mockResolvedValue({ _sum: { amount: 500n } });

			const total = await sumPriorRefunds(
				tx as never,
				'tenant-1',
				'CUSTOMER',
				'sale-1',
			);

			expect(total).toBe(500n);
			expect(tx.paymentVoucher.aggregate).toHaveBeenCalledWith({
				_sum: { amount: true },
				where: {
					tenantId: 'tenant-1',
					refSaleId: 'sale-1',
					voucherType: 'PAYMENT',
					partyType: 'CUSTOMER',
					status: 'COMPLETED',
				},
			});
		});

		it('sums supplier refunds by RECEIPT vouchers on the purchase', async () => {
			const tx = txStub();
			tx.paymentVoucher.aggregate.mockResolvedValue({ _sum: { amount: null } });

			const total = await sumPriorRefunds(
				tx as never,
				'tenant-1',
				'SUPPLIER',
				'purchase-1',
			);

			expect(total).toBe(0n);
			expect(tx.paymentVoucher.aggregate).toHaveBeenCalledWith({
				_sum: { amount: true },
				where: {
					tenantId: 'tenant-1',
					refPurchaseId: 'purchase-1',
					voucherType: 'RECEIPT',
					partyType: 'SUPPLIER',
					status: 'COMPLETED',
				},
			});
		});
	});

	describe('writeRefundVoucher', () => {
		const customerInput = {
			tenantId: 'tenant-1',
			userId: 'user-1',
			partyType: 'CUSTOMER' as const,
			partyId: 'customer-1',
			originalId: 'sale-1',
			returnId: 'return-1',
			amount: 300n,
			method: 'CASH' as const,
			note: ' damaged ',
		};

		it('writes a PAYMENT voucher, line and ledger row for a customer refund', async () => {
			const tx = txStub();
			tx.paymentVoucher.create.mockResolvedValue({
				id: 'voucher-1',
				docNo: 'RFS-ABC',
			});

			const result = await writeRefundVoucher(tx as never, customerInput);

			expect(result).toEqual({
				voucherId: 'voucher-1',
				docNo: 'RFS-ABC',
				amount: 300n,
				method: 'CASH',
				partyType: 'CUSTOMER',
				partyId: 'customer-1',
			});
			const voucherArg = tx.paymentVoucher.create.mock.calls[0][0];
			expect(voucherArg.data).toMatchObject({
				voucherType: 'PAYMENT',
				partyType: 'CUSTOMER',
				partyId: 'customer-1',
				amount: 300n,
				method: 'CASH',
				refSaleId: 'sale-1',
				refPurchaseId: null,
				customerId: 'customer-1',
				supplierId: null,
				idempotencyKey: 'refund:return-1',
				status: 'COMPLETED',
				note: 'damaged',
			});
			expect(voucherArg.data.docNo).toMatch(/^RFS-[0-9A-F]{16}$/);
			expect(voucherArg.data.lines.create).toEqual([
				{
					method: 'CASH',
					amount: 300n,
					refSaleId: 'sale-1',
					refPurchaseId: null,
				},
			]);
			expect(tx.debtLedger.create).toHaveBeenCalledWith({
				data: {
					tenantId: 'tenant-1',
					partyType: 'CUSTOMER',
					partyId: 'customer-1',
					entryType: 'ADJUST',
					direction: 'INCREASE',
					amount: 300n,
					balanceAfter: null,
					refType: 'SALE_RETURN_REFUND',
					refId: 'return-1',
					createdBy: 'user-1',
				},
			});
		});

		it('writes a RECEIPT voucher with the mirrored supplier direction', async () => {
			const tx = txStub();
			tx.paymentVoucher.create.mockResolvedValue({
				id: 'voucher-2',
				docNo: 'RFP-XYZ',
			});

			await writeRefundVoucher(tx as never, {
				...customerInput,
				partyType: 'SUPPLIER',
				partyId: 'supplier-1',
				originalId: 'purchase-1',
				method: 'BANK_TRANSFER',
			});

			const voucherArg = tx.paymentVoucher.create.mock.calls[0][0];
			expect(voucherArg.data).toMatchObject({
				voucherType: 'RECEIPT',
				partyType: 'SUPPLIER',
				partyId: 'supplier-1',
				refSaleId: null,
				refPurchaseId: 'purchase-1',
				customerId: null,
				supplierId: 'supplier-1',
				method: 'BANK_TRANSFER',
			});
			expect(voucherArg.data.docNo).toMatch(/^RFP-[0-9A-F]{16}$/);
			expect(tx.debtLedger.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						refType: 'PURCHASE_RETURN_REFUND',
						balanceAfter: null,
						direction: 'INCREASE',
					}),
				}),
			);
		});

		it('maps a unique-constraint clash to REFUND_ALREADY_APPLIED', async () => {
			const tx = txStub();
			tx.paymentVoucher.create.mockRejectedValue(
				new Prisma.PrismaClientKnownRequestError('dup', {
					code: 'P2002',
					clientVersion: 'test',
				}),
			);

			await expect(
				writeRefundVoucher(tx as never, customerInput),
			).rejects.toMatchObject({
				response: { reason: 'REFUND_ALREADY_APPLIED' },
			});
			expect(tx.debtLedger.create).not.toHaveBeenCalled();
		});

		it('rejects a refund when the party is missing', async () => {
			const tx = txStub();

			await expect(
				writeRefundVoucher(tx as never, { ...customerInput, partyId: null }),
			).rejects.toMatchObject({
				response: { reason: 'REFUND_PARTY_MISSING' },
			});
			expect(tx.paymentVoucher.create).not.toHaveBeenCalled();
		});
	});
});
