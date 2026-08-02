import { UnprocessableEntityException } from '@nestjs/common';
import { ProductKind, ProductStatus } from '@prisma/client';

/**
 * Pure sale eligibility (catalog hard flags). No Prisma I/O.
 * PHI/REI/withdrawal keys remain advisory unless the sale supplies the relevant date.
 */

export type SaleEligibilityReason =
	| 'PRODUCT_UNSELLABLE'
	| 'PRODUCT_LOCKED'
	| 'PRODUCT_RECALLED'
	| 'PRODUCT_INACTIVE'
	| 'PRODUCT_LIVESTOCK_UNSELLABLE'
	| 'PRODUCT_PHI_ACTIVE'
	| 'PRODUCT_WITHDRAWAL_ACTIVE'
	| 'PRODUCT_PRESCRIPTION_REQUIRED'
	| 'PRODUCT_INGREDIENT_BANNED';

export type SaleRegulatoryDateContext = {
	harvestDate?: Date | string | null;
	withdrawalEndDate?: Date | string | null;
	now?: Date;
};

/** Product slice needed for hard sale gates (service may pass full Prisma product). */
export type SaleEligibleProduct = {
	id?: string;
	tenantId?: string | null;
	deletedAt?: Date | null;
	status?: ProductStatus | string | null;
	isLocked?: boolean | null;
	isRecalled?: boolean | null;
	requiresPrescription?: boolean | null;
	productKind?: ProductKind | string | null;
	activeIngredient?: string | null;
	attrs?: unknown;
};

const BLOCKED_LIVESTOCK_STATES = new Set([
	'QUARANTINED',
	'SICK',
	'DEAD',
	'REJECTED',
]);

function livestockState(attrs: unknown): string | undefined {
	if (attrs == null || typeof attrs !== 'object' || Array.isArray(attrs))
		return undefined;
	const source = attrs as Record<string, unknown>;
	const value =
		source.livestockStatus ?? source.livestock_status ?? source.status;
	return typeof value === 'string' ? value.trim().toUpperCase() : undefined;
}

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
	expectedTenantId?: string,
): asserts product is SaleEligibleProduct {
	if (product == null) {
		throw new UnprocessableEntityException({
			reason: 'PRODUCT_UNSELLABLE' satisfies SaleEligibilityReason,
			message: 'Product is missing or not available for sale',
			field: 'productId',
		});
	}

	if (
		(product.deletedAt !== null && product.deletedAt !== undefined) ||
		(expectedTenantId !== undefined && product.tenantId !== expectedTenantId)
	) {
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

	if (
		product.productKind === ProductKind.LIVESTOCK_SEED &&
		livestockState(product.attrs) &&
		BLOCKED_LIVESTOCK_STATES.has(livestockState(product.attrs) as string)
	) {
		throw new UnprocessableEntityException({
			reason: 'PRODUCT_LIVESTOCK_UNSELLABLE' satisfies SaleEligibilityReason,
			message: 'Livestock is not in a sellable health state',
			field: 'productId',
			productKind: ProductKind.LIVESTOCK_SEED,
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

function positiveDays(value: number | string | undefined): number | undefined {
	const days = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(days) && days > 0 ? days : undefined;
}

function day(value: Date | string): Date {
	const parsed = value instanceof Date ? new Date(value) : new Date(value);
	parsed.setUTCHours(0, 0, 0, 0);
	return parsed;
}

function clearanceDate(now: Date, days: number): Date {
	const clearance = new Date(now);
	clearance.setUTCDate(clearance.getUTCDate() + Math.ceil(days));
	return clearance;
}

const WITHDRAWAL_PERIODS = [
	{ key: 'withdrawalMeatDays', label: 'meat' },
	{ key: 'withdrawalMilkDays', label: 'milk' },
	{ key: 'withdrawalEggDays', label: 'egg' },
] as const;

/** Hard regulatory date gates; missing event dates remain backward compatible. */
export function assertSaleRegulatoryDates(
	product: SaleEligibleProduct,
	context: SaleRegulatoryDateContext,
): void {
	const advisories = extractSaleAdvisories(product.attrs);
	const now = day(context.now ?? new Date());
	const harvestDate = context.harvestDate
		? day(context.harvestDate)
		: undefined;
	const withdrawalEndDate = context.withdrawalEndDate
		? day(context.withdrawalEndDate)
		: undefined;
	const productKind =
		product.productKind != null ? String(product.productKind) : undefined;

	if (product.productKind === ProductKind.PESTICIDE && harvestDate) {
		const phiDays = positiveDays(advisories.phiDays);
		if (phiDays !== undefined && harvestDate < clearanceDate(now, phiDays)) {
			throw new UnprocessableEntityException({
				reason: 'PRODUCT_PHI_ACTIVE' satisfies SaleEligibilityReason,
				message: 'Product remains within the pre-harvest interval',
				field: 'harvestDate',
				...(productKind ? { productKind } : {}),
			});
		}
		const reiDays = positiveDays(advisories.reiDays);
		if (reiDays !== undefined && harvestDate < clearanceDate(now, reiDays)) {
			throw new UnprocessableEntityException({
				reason: 'PRODUCT_PHI_ACTIVE' satisfies SaleEligibilityReason,
				message: 'Product remains within the re-entry interval',
				field: 'harvestDate',
				...(productKind ? { productKind } : {}),
			});
		}
	}

	if (
		product.productKind === ProductKind.VET_DRUG &&
		withdrawalEndDate &&
		withdrawalEndDate >= now
	) {
		for (const period of WITHDRAWAL_PERIODS) {
			if (positiveDays(advisories[period.key]) === undefined) continue;
			throw new UnprocessableEntityException({
				reason: 'PRODUCT_WITHDRAWAL_ACTIVE' satisfies SaleEligibilityReason,
				message: `Product remains within the veterinary ${period.label} withdrawal period`,
				field: 'withdrawalEndDate',
				...(productKind ? { productKind } : {}),
			});
		}
	}
}

/**
 * Prescription-only products must be sold to a customer on record; anonymous
 * (walk-in) sales are rejected so the store keeps a traceable buyer.
 */
export function assertPrescriptionCustomer(
	product: SaleEligibleProduct,
	customerId: string | null | undefined,
): void {
	if (product.requiresPrescription !== true) return;
	if (typeof customerId === 'string' && customerId.trim().length > 0) return;
	throw new UnprocessableEntityException({
		reason: 'PRODUCT_PRESCRIPTION_REQUIRED' satisfies SaleEligibilityReason,
		message: 'Prescription product requires a registered customer',
		field: 'customerId',
		...(product.productKind != null
			? { productKind: String(product.productKind) }
			: {}),
	});
}

/** Store-declared banned ingredients, compared on the same normalized form. */
export function normalizeIngredientName(value: string): string {
	return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Reads the ingredient from the column first, then the kind-specific attr. */
function productIngredients(product: SaleEligibleProduct): string[] {
	const attrs =
		product.attrs != null &&
		typeof product.attrs === 'object' &&
		!Array.isArray(product.attrs)
			? (product.attrs as Record<string, unknown>)
			: undefined;
	return [
		product.activeIngredient,
		attrs?.activeIngredient,
		attrs?.active_ingredient,
	]
		.filter((value): value is string => typeof value === 'string')
		.map(normalizeIngredientName)
		.filter((value) => value.length > 0);
}

export function assertIngredientNotBanned(
	product: SaleEligibleProduct,
	bannedNormalizedNames: ReadonlySet<string>,
): void {
	if (bannedNormalizedNames.size === 0) return;
	for (const ingredient of productIngredients(product)) {
		if (!bannedNormalizedNames.has(ingredient)) continue;
		throw new UnprocessableEntityException({
			reason: 'PRODUCT_INGREDIENT_BANNED' satisfies SaleEligibilityReason,
			message: 'Product contains an active ingredient banned by this store',
			field: 'productId',
			...(product.productKind != null
				? { productKind: String(product.productKind) }
				: {}),
		});
	}
}
