import { ProductKind, ProductStatus } from '@prisma/client';
import {
	assertIngredientNotBanned,
	assertPrescriptionCustomer,
	assertProductSaleEligible,
	assertSaleRegulatoryDates,
	extractSaleAdvisories,
	normalizeIngredientName,
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
				assertProductSaleEligible(baseProduct({ attrs: { status: 'SICK' } })),
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
				assertSaleRegulatoryDates(baseProduct({ attrs: { phiDays: 7 } }), {
					now,
					harvestDate: '2026-07-30',
				}),
			).toThrow(
				expect.objectContaining({
					response: expect.objectContaining({ reason: 'PRODUCT_PHI_ACTIVE' }),
				}),
			);
		});

		it('allows harvest on the PHI clearance date', () => {
			expect(() =>
				assertSaleRegulatoryDates(baseProduct({ attrs: { phi_days: '7' } }), {
					now,
					harvestDate: '2026-07-31',
				}),
			).not.toThrow();
		});

		it('rejects harvest before the REI clearance date even when PHI alone passes', () => {
			expect(() =>
				assertSaleRegulatoryDates(
					baseProduct({ attrs: { phiDays: 7, reiDays: 21 } }),
					{ now, harvestDate: '2026-07-31' },
				),
			).toThrow(
				expect.objectContaining({
					response: expect.objectContaining({
						reason: 'PRODUCT_PHI_ACTIVE',
						field: 'harvestDate',
						productKind: ProductKind.PESTICIDE,
					}),
				}),
			);
		});

		it('allows harvest on the REI clearance date', () => {
			expect(() =>
				assertSaleRegulatoryDates(baseProduct({ attrs: { rei_days: '7' } }), {
					now,
					harvestDate: '2026-07-31',
				}),
			).not.toThrow();
		});

		it('does not gate PHI or REI on a non-pesticide kind', () => {
			expect(() =>
				assertSaleRegulatoryDates(
					baseProduct({
						productKind: ProductKind.FERTILIZER,
						attrs: { phiDays: 7, reiDays: 21 },
					}),
					{ now, harvestDate: '2026-07-25' },
				),
			).not.toThrow();
		});

		it.each([
			['withdrawalMeatDays', 'meat'],
			['withdrawalMilkDays', 'milk'],
			['withdrawalEggDays', 'egg'],
		])('rejects an active %s withdrawal period independently', (key, label) => {
			expect(() =>
				assertSaleRegulatoryDates(
					baseProduct({
						productKind: ProductKind.VET_DRUG,
						attrs: { [key]: 14 },
					}),
					{ now, withdrawalEndDate: '2026-07-25' },
				),
			).toThrow(
				expect.objectContaining({
					response: expect.objectContaining({
						reason: 'PRODUCT_WITHDRAWAL_ACTIVE',
						field: 'withdrawalEndDate',
						productKind: ProductKind.VET_DRUG,
						message: `Product remains within the veterinary ${label} withdrawal period`,
					}),
				}),
			);
		});

		it('rejects a withdrawal end date falling exactly on the sale date', () => {
			expect(() =>
				assertSaleRegulatoryDates(
					baseProduct({
						productKind: ProductKind.VET_DRUG,
						attrs: { withdrawal_milk_days: '5' },
					}),
					{ now, withdrawalEndDate: '2026-07-24' },
				),
			).toThrow(
				expect.objectContaining({
					response: expect.objectContaining({
						reason: 'PRODUCT_WITHDRAWAL_ACTIVE',
					}),
				}),
			);
		});

		it('allows a withdrawal end date one day before the sale date', () => {
			expect(() =>
				assertSaleRegulatoryDates(
					baseProduct({
						productKind: ProductKind.VET_DRUG,
						attrs: { withdrawalMeatDays: 14 },
					}),
					{ now, withdrawalEndDate: '2026-07-23' },
				),
			).not.toThrow();
		});

		it('does not gate withdrawal on a non-veterinary kind', () => {
			expect(() =>
				assertSaleRegulatoryDates(
					baseProduct({ attrs: { withdrawalMeatDays: 14 } }),
					{ now, withdrawalEndDate: '2026-07-25' },
				),
			).not.toThrow();
		});

		it('allows missing dates and an expired withdrawal period', () => {
			expect(() =>
				assertSaleRegulatoryDates(
					baseProduct({
						productKind: ProductKind.VET_DRUG,
						attrs: { withdrawalEggDays: 5 },
					}),
					{ now, withdrawalEndDate: '2026-07-23' },
				),
			).not.toThrow();
			expect(() =>
				assertSaleRegulatoryDates(baseProduct({ attrs: { phiDays: 7 } }), {
					now,
				}),
			).not.toThrow();
		});
	});

	describe('assertPrescriptionCustomer', () => {
		const prescription = baseProduct({
			productKind: ProductKind.VET_DRUG,
			requiresPrescription: true,
		});

		it('allows a prescription product sold to a registered customer', () => {
			expect(() =>
				assertPrescriptionCustomer(prescription, 'cust-1'),
			).not.toThrow();
		});

		it('rejects an anonymous sale of a prescription product', () => {
			for (const customerId of [undefined, null, '', '   ']) {
				expect(() =>
					assertPrescriptionCustomer(prescription, customerId),
				).toThrow(
					expect.objectContaining({
						response: expect.objectContaining({
							reason: 'PRODUCT_PRESCRIPTION_REQUIRED',
							field: 'customerId',
							productKind: ProductKind.VET_DRUG,
						}),
					}),
				);
			}
		});

		it('leaves non-prescription products anonymous-sellable', () => {
			expect(() => assertPrescriptionCustomer(baseProduct(), null)).not.toThrow();
		});
	});

	describe('assertIngredientNotBanned', () => {
		it('rejects a product whose column ingredient is banned', () => {
			expect(() =>
				assertIngredientNotBanned(
					baseProduct({ activeIngredient: '  Paraquat  ' }),
					new Set(['paraquat']),
				),
			).toThrow(
				expect.objectContaining({
					response: expect.objectContaining({
						reason: 'PRODUCT_INGREDIENT_BANNED',
						field: 'productId',
						productKind: ProductKind.PESTICIDE,
					}),
				}),
			);
		});

		it('rejects a banned ingredient declared in attrs (both spellings)', () => {
			for (const key of ['activeIngredient', 'active_ingredient']) {
				expect(() =>
					assertIngredientNotBanned(
						baseProduct({ attrs: { [key]: 'Glyphosate' } }),
						new Set(['glyphosate']),
					),
				).toThrow(
					expect.objectContaining({
						response: expect.objectContaining({
							reason: 'PRODUCT_INGREDIENT_BANNED',
						}),
					}),
				);
			}
		});

		it('allows products when the ban list is empty or does not match', () => {
			expect(() =>
				assertIngredientNotBanned(
					baseProduct({ activeIngredient: 'Paraquat' }),
					new Set(),
				),
			).not.toThrow();
			expect(() =>
				assertIngredientNotBanned(
					baseProduct({ activeIngredient: 'Abamectin' }),
					new Set(['paraquat']),
				),
			).not.toThrow();
		});

		it('normalizes case and collapsed whitespace on both sides', () => {
			expect(normalizeIngredientName('  Hoạt   Chất A ')).toBe('hoạt chất a');
			expect(() =>
				assertIngredientNotBanned(
					baseProduct({ activeIngredient: 'Hoạt   Chất A' }),
					new Set([normalizeIngredientName('hoạt chất a')]),
				),
			).toThrow(
				expect.objectContaining({
					response: expect.objectContaining({
						reason: 'PRODUCT_INGREDIENT_BANNED',
					}),
				}),
			);
		});
	});
});
