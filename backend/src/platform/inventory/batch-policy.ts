import { UnprocessableEntityException } from '@nestjs/common';
import { ProductKind } from '@prisma/client';

/**
 * Phase-1 batchCode required (catalog §5–9). AQUA_* kept controlled for
 * schema parity; aquaculture rules still out of product scope.
 */
const BATCH_CODE_REQUIRED = new Set<ProductKind>([
	ProductKind.PESTICIDE,
	ProductKind.VET_DRUG,
	ProductKind.ANIMAL_FEED,
	ProductKind.SEED,
	ProductKind.SEEDLING,
	ProductKind.CROP_SEED,
	ProductKind.LIVESTOCK_SEED,
	ProductKind.AQUA_DRUG,
	ProductKind.AQUA_FEED,
	ProductKind.AQUA_SEED,
]);

/** Optional lot: receive may create batch; sale FEFO if any batch stock exists. */
const BATCH_CODE_OPTIONAL = new Set<ProductKind>([
	ProductKind.FERTILIZER,
	ProductKind.AGRI_MATERIAL,
]);

const EXPIRES_AT_REQUIRED = new Set<ProductKind>([
	ProductKind.PESTICIDE,
	ProductKind.VET_DRUG,
	ProductKind.ANIMAL_FEED,
	ProductKind.AQUA_DRUG,
	ProductKind.AQUA_FEED,
]);

export function isBatchCodeRequired(productKind?: ProductKind | null): boolean {
	if (!productKind || productKind === ProductKind.OTHER) return false;
	return BATCH_CODE_REQUIRED.has(productKind);
}

export function isBatchControlled(productKind?: ProductKind | null): boolean {
	if (!productKind || productKind === ProductKind.OTHER) return false;
	return (
		BATCH_CODE_REQUIRED.has(productKind) || BATCH_CODE_OPTIONAL.has(productKind)
	);
}

export function requiresInboundExpiry(
	productKind?: ProductKind | null,
): boolean {
	if (!productKind) return false;
	return EXPIRES_AT_REQUIRED.has(productKind);
}

function startOfTodayUtc(): Date {
	const d = new Date();
	d.setUTCHours(0, 0, 0, 0);
	return d;
}

function isPastDate(expiresAt: Date): boolean {
	const day = new Date(expiresAt);
	day.setUTCHours(0, 0, 0, 0);
	return day.getTime() < startOfTodayUtc().getTime();
}

export function assertInboundBatch(
	productKind: ProductKind | null | undefined,
	batchCode: string | null | undefined,
	expiresAt: Date | null | undefined,
): void {
	const code = batchCode?.trim() ?? '';

	if (isBatchCodeRequired(productKind) && !code) {
		throw new UnprocessableEntityException({
			reason: 'BATCH_REQUIRED',
			message: 'Batch code is required for this product',
		});
	}

	if (!code) return;

	if (requiresInboundExpiry(productKind) && !expiresAt) {
		throw new UnprocessableEntityException({
			reason: 'BATCH_EXPIRY_REQUIRED',
			message: 'Expiry date is required for this product kind',
		});
	}

	if (expiresAt && isPastDate(expiresAt)) {
		throw new UnprocessableEntityException({
			reason: 'BATCH_EXPIRED_INBOUND',
			message: 'Inbound batch expiry is in the past',
		});
	}
}

export function shouldUpsertInboundBatch(
	productKind: ProductKind | null | undefined,
	batchCode: string | null | undefined,
): boolean {
	const code = batchCode?.trim() ?? '';
	if (!code) return false;
	return isBatchControlled(productKind);
}

export function assertBatchNotRecalled(isRecalled: boolean | undefined): void {
	if (isRecalled) {
		throw new UnprocessableEntityException({
			reason: 'BATCH_RECALLED_INBOUND',
			message: 'Cannot receive stock into a recalled batch',
		});
	}
}
