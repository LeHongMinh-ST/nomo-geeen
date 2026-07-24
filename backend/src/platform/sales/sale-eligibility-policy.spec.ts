import { ProductKind, ProductStatus } from '@prisma/client';
import {
	assertProductSaleEligible,
	assertSaleRegulatoryDates,
	extractSaleAdvisories,
	type SaleEligibleProduct,
} from './sale-eligibility-policy';

function baseProduct(
	overrides: Partial<SaleEligibleProduct> = {},
): SaleEligibleProduct {
	return {
		id: 'prod-1',
		status: ProductStatus.ACTIVE,
		isLocked: false,
		isRecalled: false,
		productKind: ProductKind.PESTICIDE,
		attrs: {},
		...overrides,
	};
}

describe('sale-eligibility-policy', () => {
	describe('assertProductSaleEligible', () => {
		it('allows ACTIVE unlocked non-recalled product', () => {
			expect(() => assertProductSaleEligible(baseProduct())).not.toThrow();
		});

		it('rejects null product as PRODUCT_UNSELLABLE', () => {
			expect(() => assertProductSaleEligible(null)).toThrow(
				expect.objectContaining({
					response: expect.objectContaining({
						reason: 'PRODUCT_UNSELLABLE',
						field: 'productId',
					}),
				}),
			);
		});

		it('rejects undefined product as PRODUCT_UNSELLABLE', () => {
			expect(() => assertProductSaleEligible(undefined)).toThrow(
				expect.objectContaining({
					response: expect.objectContaining({
						reason: 'PRODUCT_UNSELLABLE',
						field: 'productId',
					}),
				}),
			);
		});

		it('rejects INACTIVE as PRODUCT_INACTIVE with productKind', () => {
			expect(() =>
				assertProductSaleEligible(
					baseProduct({ status: ProductStatus.INACTIVE }),
				),
			).toThrow(
				expect.objectContaining({
					response: expect.objectContaining({
						reason: 'PRODUCT_INACTIVE',
						field: 'productId',
						productKind: ProductKind.PESTICIDE,
					}),
				}),
			);
		});

		it('rejects locked product as PRODUCT_LOCKED', () => {
			expect(() =>
				assertProductSaleEligible(baseProduct({ isLocked: true })),
			).toThrow(
				expect.objectContaining({
					response: expect.objectContaining({
						reason: 'PRODUCT_LOCKED',
						field: 'productId',
					}),
				}),
			);
		});

		it('rejects recalled product as PRODUCT_RECALLED', () => {
			expect(() =>
				assertProductSaleEligible(baseProduct({ isRecalled: true })),
			).toThrow(
				expect.objectContaining({
					response: expect.objectContaining({
						reason: 'PRODUCT_RECALLED',
						field: 'productId',
					}),
				}),
			);
		});

		it('prefers PRODUCT_RECALLED over locked and inactive', () => {
			expect(() =>
				assertProductSaleEligible(
					baseProduct({
						isRecalled: true,
						isLocked: true,
						status: ProductStatus.INACTIVE,
					}),
				),
			).toThrow(
				expect.objectContaining({
					response: expect.objectContaining({
						reason: 'PRODUCT_RECALLED',
					}),
				}),
			);
		});

		it('prefers PRODUCT_LOCKED over inactive when not recalled', () => {
			expect(() =>
				assertProductSaleEligible(
					baseProduct({
						isLocked: true,
						status: ProductStatus.INACTIVE,
					}),
				),
			).toThrow(
				expect.objectContaining({
					response: expect.objectContaining({
						reason: 'PRODUCT_LOCKED',
					}),
				}),
			);
		});

		it.each(['QUARANTINED', 'SICK', 'DEAD', 'REJECTED'])(
			'rejects livestock state %s',
			(state) => {
				expect(() =>
					assertProductSaleEligible(
						baseProduct({
							productKind: ProductKind.LIVESTOCK_SEED,
							attrs: { livestockStatus: state },
						}),
					),
				).toThrow(
					expect.objectContaining({
						response: expect.objectContaining({
							reason: 'PRODUCT_LIVESTOCK_UNSELLABLE',
							productKind: ProductKind.LIVESTOCK_SEED,
						}),
					}),
				);
			},
		);

		it('allows healthy livestock and ignores state on other product kinds', () => {
			expect(() =>
				assertProductSaleEligible(
					baseProduct({
						productKind: ProductKind.LIVESTOCK_SEED,
						attrs: { livestockStatus: 'HEALTHY' },
					}),
				),
			).not.toThrow();
			expect(() =>
				assertProductSaleEligible(
					baseProduct({ attrs: { status: 'SICK' } }),
				),
			).not.toThrow();
		});
	});

	describe('extractSaleAdvisories', () => {
		it('returns empty object for null/undefined/non-object', () => {
			expect(extractSaleAdvisories(null)).toEqual({});
			expect(extractSaleAdvisories(undefined)).toEqual({});
			expect(extractSaleAdvisories('x')).toEqual({});
			expect(extractSaleAdvisories([])).toEqual({});
		});

		it('does not throw on empty attrs', () => {
			expect(() => extractSaleAdvisories({})).not.toThrow();
			expect(extractSaleAdvisories({})).toEqual({});
		});

		it('extracts camelCase advisory keys', () => {
			expect(
				extractSaleAdvisories({
					phiDays: 7,
					reiDays: 24,
					withdrawalMeatDays: 14,
					ignored: 1,
				}),
			).toEqual({
				phiDays: 7,
				reiDays: 24,
				withdrawalMeatDays: 14,
			});
		});

		it('accepts snake_case aliases', () => {
			expect(
				extractSaleAdvisories({
					phi_days: 3,
					withdrawal_milk_days: 5,
					withdrawal_egg_days: 2,
				}),
			).toEqual({
				phiDays: 3,
				withdrawalMilkDays: 5,
				withdrawalEggDays: 2,
			});
		});
	});

	describe('assertSaleRegulatoryDates', () => {
		const now = new Date('2026-07-24T12:00:00.000Z');

		it('rejects harvest before the PHI clearance date', () => {
			expect(() =>
				assertSaleRegulatoryDates(
					baseProduct({ attrs: { phiDays: 7 } }),
					{ now, harvestDate: '2026-07-30' },
				),
			).toThrow(
				expect.objectContaining({
					response: expect.objectContaining({ reason: 'PRODUCT_PHI_ACTIVE' }),
				}),
			);
		});

		it('allows harvest on the PHI clearance date', () => {
			expect(() =>
				assertSaleRegulatoryDates(
					baseProduct({ attrs: { phi_days: '7' } }),
					{ now, harvestDate: '2026-07-31' },
				),
			).not.toThrow();
		});

		it('rejects an active veterinary withdrawal period', () => {
			expect(() =>
				assertSaleRegulatoryDates(
					baseProduct({ attrs: { withdrawalMeatDays: 14 } }),
					{ now, withdrawalEndDate: '2026-07-25' },
				),
			).toThrow(
				expect.objectContaining({
					response: expect.objectContaining({ reason: 'PRODUCT_WITHDRAWAL_ACTIVE' }),
				}),
			);
		});

		it('allows missing dates and an expired withdrawal period', () => {
			expect(() =>
			assertSaleRegulatoryDates(
				baseProduct({ attrs: { phiDays: 7, withdrawalEggDays: 5 } }),
				{ now, withdrawalEndDate: '2026-07-23' },
			),
		).not.toThrow();
			expect(() =>
			assertSaleRegulatoryDates(baseProduct({ attrs: { phiDays: 7 } }), { now }),
		).not.toThrow();
		});
	});
});
