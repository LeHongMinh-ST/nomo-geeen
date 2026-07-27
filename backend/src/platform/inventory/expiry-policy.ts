/**
 * Tiered expiry warnings for batch stock (catalog §5.1: cảnh báo 180/90/30 ngày).
 *
 * Pure module: every classification is evaluated against a caller-supplied `now`
 * so callers stay deterministic and testable. Dates are compared as whole UTC
 * days, matching how batch-policy.ts normalises inbound expiry dates.
 */

/** Closed set of expiry tiers. Ordered from worst to best. */
export const EXPIRY_TIERS = [
	'EXPIRED',
	'CRITICAL',
	'WARNING',
	'NOTICE',
	'FRESH',
	'NONE',
] as const;

export type ExpiryTier = (typeof EXPIRY_TIERS)[number];

/**
 * Upper bound (inclusive, in days remaining) of each warning tier.
 * Mirrors the 30/90/180 day marks in catalog §5.1.
 */
export const EXPIRY_TIER_DAYS = {
	CRITICAL: 30,
	WARNING: 90,
	NOTICE: 180,
} as const;

/**
 * Severity ranking used when collapsing many batches into one tier.
 * Higher wins. NONE ranks lowest so any dated batch outranks an undated one.
 */
const TIER_SEVERITY: Record<ExpiryTier, number> = {
	NONE: 0,
	FRESH: 1,
	NOTICE: 2,
	WARNING: 3,
	CRITICAL: 4,
	EXPIRED: 5,
};

function startOfUtcDay(value: Date): number {
	const day = new Date(value);
	day.setUTCHours(0, 0, 0, 0);
	return day.getTime();
}

/**
 * Whole UTC days remaining until `expiresAt`, relative to `now`.
 * Negative once the date has passed; null when the batch carries no expiry.
 */
export function daysToExpiry(
	expiresAt: Date | null | undefined,
	now: Date,
): number | null {
	if (!expiresAt) return null;
	const diff = startOfUtcDay(expiresAt) - startOfUtcDay(now);
	return Math.round(diff / 86_400_000);
}

/**
 * Classify a batch expiry date into exactly one tier.
 * Zero days left is CRITICAL, not EXPIRED — the batch is still sellable today.
 */
export function classifyExpiry(
	expiresAt: Date | null | undefined,
	now: Date,
): ExpiryTier {
	const days = daysToExpiry(expiresAt, now);
	if (days === null) return 'NONE';
	if (days < 0) return 'EXPIRED';
	if (days <= EXPIRY_TIER_DAYS.CRITICAL) return 'CRITICAL';
	if (days <= EXPIRY_TIER_DAYS.WARNING) return 'WARNING';
	if (days <= EXPIRY_TIER_DAYS.NOTICE) return 'NOTICE';
	return 'FRESH';
}

/** Worst tier across a product's batches. NONE when there is nothing to rank. */
export function worstExpiryTier(tiers: readonly ExpiryTier[]): ExpiryTier {
	let worst: ExpiryTier = 'NONE';
	for (const tier of tiers) {
		if (TIER_SEVERITY[tier] > TIER_SEVERITY[worst]) worst = tier;
	}
	return worst;
}

/** Zeroed counter for every tier — keeps the summary shape stable and complete. */
export function emptyTierCounts(): Record<ExpiryTier, number> {
	return {
		EXPIRED: 0,
		CRITICAL: 0,
		WARNING: 0,
		NOTICE: 0,
		FRESH: 0,
		NONE: 0,
	};
}
