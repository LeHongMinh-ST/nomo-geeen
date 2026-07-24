import { UnprocessableEntityException } from '@nestjs/common';
import { LivestockHealthState, ProductKind } from '@prisma/client';

/** First-slice outbound transitions: only from HEALTHY. */
const ALLOWED_FROM_HEALTHY = new Set<LivestockHealthState>([
	LivestockHealthState.QUARANTINED,
	LivestockHealthState.SICK,
	LivestockHealthState.DEAD,
	LivestockHealthState.REJECTED,
]);

/** Recoverable sources require explicit approveRecovery → HEALTHY. */
const RECOVERABLE_SOURCES = new Set<LivestockHealthState>([
	LivestockHealthState.QUARANTINED,
	LivestockHealthState.SICK,
]);

export type LivestockTransitionReason =
	| 'NOT_LIVESTOCK'
	| 'INVALID_TRANSITION'
	| 'RECOVERY_NOT_APPROVED'
	| 'SAME_STATE'
	| 'STALE_VERSION';

export type LivestockTransitionOptions = {
	/** Required true for QUARANTINED|SICK → HEALTHY. Ignored otherwise. */
	approveRecovery?: boolean;
};

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
 * Validate livestock health transition.
 * - HEALTHY → QUARANTINED|SICK|DEAD|REJECTED (first slice)
 * - QUARANTINED|SICK → HEALTHY only when approveRecovery=true
 * - DEAD|REJECTED: no transitions
 * Caller still enforces optimistic version.
 */
export function assertLivestockTransition(
	from: LivestockHealthState | string,
	to: LivestockHealthState | string,
	options?: LivestockTransitionOptions,
): void {
	const current = String(from) as LivestockHealthState;
	const next = String(to) as LivestockHealthState;
	const approveRecovery = options?.approveRecovery === true;

	if (current === next) {
		throw new UnprocessableEntityException({
			reason: 'SAME_STATE' satisfies LivestockTransitionReason,
			message: 'Batch is already in the requested health state',
			field: 'toState',
			fromState: current,
			toState: next,
		});
	}

	if (current === LivestockHealthState.HEALTHY) {
		if (!ALLOWED_FROM_HEALTHY.has(next)) {
			throw new UnprocessableEntityException({
				reason: 'INVALID_TRANSITION' satisfies LivestockTransitionReason,
				message: 'Target health state is not allowed from HEALTHY',
				field: 'toState',
				fromState: current,
				toState: next,
			});
		}
		return;
	}

	// Recovery path: QUARANTINED|SICK → HEALTHY with explicit approval
	if (
		RECOVERABLE_SOURCES.has(current) &&
		next === LivestockHealthState.HEALTHY
	) {
		if (!approveRecovery) {
			throw new UnprocessableEntityException({
				reason: 'RECOVERY_NOT_APPROVED' satisfies LivestockTransitionReason,
				message:
					'Recovery to HEALTHY requires approveRecovery=true (tenant inventory:edit)',
				field: 'approveRecovery',
				fromState: current,
				toState: next,
			});
		}
		return;
	}

	throw new UnprocessableEntityException({
		reason: 'INVALID_TRANSITION' satisfies LivestockTransitionReason,
		message:
			'Transition is not allowed; DEAD/REJECTED are terminal and recovery only applies to QUARANTINED/SICK with approval',
		field: 'toState',
		fromState: current,
		toState: next,
	});
}

export function isAllowedLivestockTarget(
	to: LivestockHealthState | string,
): boolean {
	const target = String(to) as LivestockHealthState;
	return (
		ALLOWED_FROM_HEALTHY.has(target) || target === LivestockHealthState.HEALTHY
	);
}

export function isRecoverableSource(
	from: LivestockHealthState | string,
): boolean {
	return RECOVERABLE_SOURCES.has(String(from) as LivestockHealthState);
}
