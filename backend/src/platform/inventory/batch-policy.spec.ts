import { ProductKind } from '@prisma/client';
import {
	assertBatchNotRecalled,
	assertInboundBatch,
	isBatchCodeRequired,
	isBatchControlled,
	requiresInboundExpiry,
	shouldUpsertInboundBatch,
} from './batch-policy';

describe('batch-policy', () => {
	it('requires batch code for pesticide and seed kinds', () => {
		expect(isBatchCodeRequired(ProductKind.PESTICIDE)).toBe(true);
		expect(isBatchCodeRequired(ProductKind.SEED)).toBe(true);
		expect(isBatchCodeRequired(ProductKind.FERTILIZER)).toBe(false);
		expect(isBatchCodeRequired(ProductKind.OTHER)).toBe(false);
	});

	it('treats fertilizer as optional batch-controlled', () => {
		expect(isBatchControlled(ProductKind.FERTILIZER)).toBe(true);
		expect(shouldUpsertInboundBatch(ProductKind.FERTILIZER, null)).toBe(false);
		expect(shouldUpsertInboundBatch(ProductKind.FERTILIZER, 'LOT-1')).toBe(
			true,
		);
	});

	it('requires expiry for pesticide/vet/feed', () => {
		expect(requiresInboundExpiry(ProductKind.PESTICIDE)).toBe(true);
		expect(requiresInboundExpiry(ProductKind.SEED)).toBe(false);
	});

	it('rejects missing batch code on controlled required kinds', () => {
		expect(() =>
			assertInboundBatch(ProductKind.PESTICIDE, null, new Date('2099-01-01')),
		).toThrow(
			expect.objectContaining({
				response: expect.objectContaining({ reason: 'BATCH_REQUIRED' }),
			}),
		);
	});

	it('rejects past expiry on inbound', () => {
		expect(() =>
			assertInboundBatch(
				ProductKind.PESTICIDE,
				'LOT-A',
				new Date('2000-01-01'),
			),
		).toThrow(
			expect.objectContaining({
				response: expect.objectContaining({
					reason: 'BATCH_EXPIRED_INBOUND',
				}),
			}),
		);
	});

	it('rejects missing expiry when kind requires it', () => {
		expect(() =>
			assertInboundBatch(ProductKind.VET_DRUG, 'LOT-B', null),
		).toThrow(
			expect.objectContaining({
				response: expect.objectContaining({
					reason: 'BATCH_EXPIRY_REQUIRED',
				}),
			}),
		);
	});

	it('allows seed with batch code and null expiry', () => {
		expect(() =>
			assertInboundBatch(ProductKind.SEED, 'SEED-1', null),
		).not.toThrow();
	});

	it('allows fertilizer without batch code', () => {
		expect(() =>
			assertInboundBatch(ProductKind.FERTILIZER, null, null),
		).not.toThrow();
	});

	it('rejects recalled inbound batches', () => {
		expect(() => assertBatchNotRecalled(true)).toThrow(
			expect.objectContaining({
				response: expect.objectContaining({
					reason: 'BATCH_RECALLED_INBOUND',
				}),
			}),
		);
		expect(() => assertBatchNotRecalled(false)).not.toThrow();
		expect(() => assertBatchNotRecalled(undefined)).not.toThrow();
	});
});
