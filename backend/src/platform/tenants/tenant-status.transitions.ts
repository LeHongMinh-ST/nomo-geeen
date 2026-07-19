import { TenantStatus } from '@prisma/client';

/**
 * Allowed tenant lifecycle transitions (metadata-only status).
 * Matches design.md state machine — five transitions only.
 */
export const TENANT_STATUS_TRANSITIONS: Readonly<
	Record<TenantStatus, readonly TenantStatus[]>
> = {
	[TenantStatus.ACTIVE]: [TenantStatus.SUSPENDED, TenantStatus.LOCKED],
	[TenantStatus.SUSPENDED]: [TenantStatus.ACTIVE, TenantStatus.LOCKED],
	[TenantStatus.LOCKED]: [TenantStatus.ACTIVE],
};

export function canTransition(
	from: TenantStatus,
	to: TenantStatus,
): boolean {
	if (from === to) return false;
	const allowed = TENANT_STATUS_TRANSITIONS[from];
	return allowed?.includes(to) ?? false;
}

/**
 * Schema-grounded detail aggregate predicates for R1-01 (documentation only).
 * - counts.users          → Tenant.users (_count)
 * - counts.subscriptions  → Tenant.subscriptions (_count, all statuses)
 * - counts.openTickets    → Tenant.supportTickets where status IN (OPEN, IN_PROGRESS)
 */
export const TENANT_DETAIL_AGGREGATES = {
	usersRelation: 'users',
	subscriptionsRelation: 'subscriptions',
	supportTicketsRelation: 'supportTickets',
	openTicketStatuses: ['OPEN', 'IN_PROGRESS'] as const,
} as const;
