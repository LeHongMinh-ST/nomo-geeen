import { UnprocessableEntityException } from '@nestjs/common';
import { ProductKind, ProductStatus } from '@prisma/client';

/**
 * Pure sale eligibility (catalog hard flags). No Prisma I/O.
 * PHI/REI/withdrawal keys are advisory only — never hard-block without harvest date.
 */

export type SaleEligibilityReason =
	| 'PRODUCT_UNSELLABLE'
	| 'PRODUCT_LOCKED'
	| 'PRODUCT_RECALLED'
	| 'PRODUCT_INACTIVE';

/** Product slice needed for hard sale gates (service may pass full Prisma product). */
export type SaleEligibleProduct = {
	id?: string;
	status?: ProductStatus | string | null;
	isLocked?: boolean | null;
	isRecalled?: boolean | null;
	productKind?: ProductKind | string | null;
	attrs?: unknown;
};

/** Documented advisory attr keys (camelCase + snake_case aliases). */
export const SALE_ADVISORY_ATTR_KEYS = [
	'phiDays',
	'reiDays',
	'withdrawalMeatDays',
	'withdrawalMilkDays',
	'withdrawalEggDays',
] as const;

const ADVISORY_ALIASES: Record<
	string,
	(typeof SALE_ADVISORY_ATTR_KEYS)[number]
> = {
	phiDays: 'phiDays',
	phi_days: 'phiDays',
	reiDays: 'reiDays',
	rei_days: 'reiDays',
	withdrawalMeatDays: 'withdrawalMeatDays',
	withdrawal_meat_days: 'withdrawalMeatDays',
	withdrawalMilkDays: 'withdrawalMilkDays',
	withdrawal_milk_days: 'withdrawalMilkDays',
	withdrawalEggDays: 'withdrawalEggDays',
	withdrawal_egg_days: 'withdrawalEggDays',
};

export type SaleAdvisories = Partial<
	Record<(typeof SALE_ADVISORY_ATTR_KEYS)[number], number | string>
>;

/**
 * Hard reject unsellable products. Order: missing → recalled → locked → inactive.
 * Prefer specific reasons over generic PRODUCT_UNSELLABLE when distinguishable.
 */
export function assertProductSaleEligible(
	product: SaleEligibleProduct | null | undefined,
): asserts product is SaleEligibleProduct {
	if (product == null) {
		throw new UnprocessableEntityException({
			reason: 'PRODUCT_UNSELLABLE' satisfies SaleEligibilityReason,
			message: 'Product is missing or not available for sale',
			field: 'productId',
		});
	}

	const productKind =
		product.productKind != null ? String(product.productKind) : undefined;

	if (product.isRecalled === true) {
		throw new UnprocessableEntityException({
			reason: 'PRODUCT_RECALLED' satisfies SaleEligibilityReason,
			message: 'Product is recalled and cannot be sold',
			field: 'productId',
			...(productKind ? { productKind } : {}),
		});
	}

	if (product.isLocked === true) {
		throw new UnprocessableEntityException({
			reason: 'PRODUCT_LOCKED' satisfies SaleEligibilityReason,
			message: 'Product is locked and cannot be sold',
			field: 'productId',
			...(productKind ? { productKind } : {}),
		});
	}

	if (product.status !== ProductStatus.ACTIVE && product.status !== 'ACTIVE') {
		throw new UnprocessableEntityException({
			reason: 'PRODUCT_INACTIVE' satisfies SaleEligibilityReason,
			message: 'Product is not active and cannot be sold',
			field: 'productId',
			...(productKind ? { productKind } : {}),
		});
	}
}

/**
 * Non-blocking advisory metadata from product attrs. Never throws on missing keys.
 */
export function extractSaleAdvisories(attrs: unknown): SaleAdvisories {
	if (attrs == null || typeof attrs !== 'object' || Array.isArray(attrs)) {
		return {};
	}

	const source = attrs as Record<string, unknown>;
	const out: SaleAdvisories = {};

	for (const [key, value] of Object.entries(source)) {
		const canonical = ADVISORY_ALIASES[key];
		if (!canonical) continue;
		if (value == null) continue;
		if (typeof value === 'number' || typeof value === 'string') {
			out[canonical] = value;
		}
	}

	return out;
}
