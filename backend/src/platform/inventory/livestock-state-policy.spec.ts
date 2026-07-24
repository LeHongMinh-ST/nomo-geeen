import { LivestockHealthState, ProductKind } from '@prisma/client';
import {
	assertLivestockProductKind,
	assertLivestockTransition,
	isAllowedLivestockTarget,
	isLivestockProductKind,
	isRecoverableSource,
} from './livestock-state-policy';

describe('livestock-state-policy', () => {
	describe('isLivestockProductKind', () => {
		it('accepts LIVESTOCK_SEED only', () => {
			expect(isLivestockProductKind(ProductKind.LIVESTOCK_SEED)).toBe(true);
			expect(isLivestockProductKind('LIVESTOCK_SEED')).toBe(true);
			expect(isLivestockProductKind(ProductKind.PESTICIDE)).toBe(false);
			expect(isLivestockProductKind(null)).toBe(false);
		});
	});

	describe('assertLivestockProductKind', () => {
		it('rejects non-livestock with NOT_LIVESTOCK', () => {
			expect(() => assertLivestockProductKind(ProductKind.ANIMAL_FEED)).toThrow(
				expect.objectContaining({
					response: expect.objectContaining({ reason: 'NOT_LIVESTOCK' }),
				}),
			);
		});

		it('allows livestock seed', () => {
			expect(() =>
				assertLivestockProductKind(ProductKind.LIVESTOCK_SEED),
			).not.toThrow();
		});
	});

	describe('assertLivestockTransition', () => {
		it.each([
			[LivestockHealthState.QUARANTINED],
			[LivestockHealthState.SICK],
			[LivestockHealthState.DEAD],
			[LivestockHealthState.REJECTED],
		] as const)('allows HEALTHY -> %s', (to) => {
			expect(() =>
				assertLivestockTransition(LivestockHealthState.HEALTHY, to),
			).not.toThrow();
			expect(isAllowedLivestockTarget(to)).toBe(true);
		});

		it('rejects same state', () => {
			expect(() =>
				assertLivestockTransition(
					LivestockHealthState.HEALTHY,
					LivestockHealthState.HEALTHY,
				),
			).toThrow(
				expect.objectContaining({
					response: expect.objectContaining({ reason: 'SAME_STATE' }),
				}),
			);
		});

		it.each([LivestockHealthState.QUARANTINED, LivestockHealthState.SICK])(
			'rejects recovery from %s without approveRecovery',
			(from) => {
				expect(() =>
					assertLivestockTransition(from, LivestockHealthState.HEALTHY),
				).toThrow(
					expect.objectContaining({
						response: expect.objectContaining({
							reason: 'RECOVERY_NOT_APPROVED',
						}),
					}),
				);
				expect(isRecoverableSource(from)).toBe(true);
			},
		);

		it.each([LivestockHealthState.QUARANTINED, LivestockHealthState.SICK])(
			'allows recovery from %s with approveRecovery',
			(from) => {
				expect(() =>
					assertLivestockTransition(from, LivestockHealthState.HEALTHY, {
						approveRecovery: true,
					}),
				).not.toThrow();
			},
		);

		it.each([LivestockHealthState.DEAD, LivestockHealthState.REJECTED])(
			'rejects recovery from terminal %s even with approveRecovery',
			(from) => {
				expect(() =>
					assertLivestockTransition(from, LivestockHealthState.HEALTHY, {
						approveRecovery: true,
					}),
				).toThrow(
					expect.objectContaining({
						response: expect.objectContaining({ reason: 'INVALID_TRANSITION' }),
					}),
				);
				expect(isRecoverableSource(from)).toBe(false);
			},
		);

		it('rejects non-HEALTHY source even to another terminal', () => {
			expect(() =>
				assertLivestockTransition(
					LivestockHealthState.SICK,
					LivestockHealthState.DEAD,
				),
			).toThrow(
				expect.objectContaining({
					response: expect.objectContaining({ reason: 'INVALID_TRANSITION' }),
				}),
			);
		});
	});
});
