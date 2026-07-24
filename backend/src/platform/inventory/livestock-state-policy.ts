import { UnprocessableEntityException } from '@nestjs/common';
import { LivestockHealthState, ProductKind } from '@prisma/client';

/** First-slice transitions: only from HEALTHY. No automatic recovery. */
const ALLOWED_FROM_HEALTHY = new Set<LivestockHealthState>([
	LivestockHealthState.QUARANTINED,
	LivestockHealthState.SICK,
	LivestockHealthState.DEAD,
	LivestockHealthState.REJECTED,
]);

export type LivestockTransitionReason =
	| 'NOT_LIVESTOCK'
	| 'INVALID_TRANSITION'
	| 'SAME_STATE'
	| 'STALE_VERSION';

export function isLivestockProductKind(
	productKind?: ProductKind | string | null,
): boolean {
	return (
		productKind === ProductKind.LIVESTOCK_SEED ||
		productKind === 'LIVESTOCK_SEED'
	);
}

export function assertLivestockProductKind(
	productKind?: ProductKind | string | null,
): void {
	if (!isLivestockProductKind(productKind)) {
		throw new UnprocessableEntityException({
			reason: 'NOT_LIVESTOCK' satisfies LivestockTransitionReason,
			message: 'Health state transitions apply only to livestock products',
			field: 'productId',
			productKind: productKind != null ? String(productKind) : undefined,
		});
	}
}

/**
 * Validate first-slice transition. Caller still enforces optimistic version.
 * Rejects same-state and any non-HEALTHY source (no recovery in this slice).
 */
export function assertLivestockTransition(
	from: LivestockHealthState | string,
	to: LivestockHealthState | string,
): void {
	const current = String(from) as LivestockHealthState;
	const next = String(to) as LivestockHealthState;

	if (current === next) {
		throw new UnprocessableEntityException({
			reason: 'SAME_STATE' satisfies LivestockTransitionReason,
			message: 'Batch is already in the requested health state',
			field: 'toState',
			fromState: current,
			toState: next,
		});
	}

	if (current !== LivestockHealthState.HEALTHY) {
		throw new UnprocessableEntityException({
			reason: 'INVALID_TRANSITION' satisfies LivestockTransitionReason,
			message:
				'Only HEALTHY batches may change health state in this release; recovery is not supported',
			field: 'toState',
			fromState: current,
			toState: next,
		});
	}

	if (!ALLOWED_FROM_HEALTHY.has(next)) {
		throw new UnprocessableEntityException({
			reason: 'INVALID_TRANSITION' satisfies LivestockTransitionReason,
			message: 'Target health state is not allowed from HEALTHY',
			field: 'toState',
			fromState: current,
			toState: next,
		});
	}
}

export function isAllowedLivestockTarget(
	to: LivestockHealthState | string,
): boolean {
	return ALLOWED_FROM_HEALTHY.has(String(to) as LivestockHealthState);
}
