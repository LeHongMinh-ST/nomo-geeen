import { TenantStatus } from '@prisma/client';
import {
	canTransition,
	TENANT_STATUS_TRANSITIONS,
	TENANT_DETAIL_AGGREGATES,
} from './tenant-status.transitions';

describe('tenant-status.transitions', () => {
	it('allows exactly five transitions', () => {
		const pairs: Array<[TenantStatus, TenantStatus]> = [];
		for (const [from, tos] of Object.entries(TENANT_STATUS_TRANSITIONS)) {
			for (const to of tos) {
				pairs.push([from as TenantStatus, to]);
			}
		}
		expect(pairs).toHaveLength(5);
		expect(canTransition(TenantStatus.ACTIVE, TenantStatus.SUSPENDED)).toBe(
			true,
		);
		expect(canTransition(TenantStatus.ACTIVE, TenantStatus.LOCKED)).toBe(true);
		expect(canTransition(TenantStatus.SUSPENDED, TenantStatus.ACTIVE)).toBe(
			true,
		);
		expect(canTransition(TenantStatus.SUSPENDED, TenantStatus.LOCKED)).toBe(
			true,
		);
		expect(canTransition(TenantStatus.LOCKED, TenantStatus.ACTIVE)).toBe(true);
	});

	it('rejects no-op and unsupported transitions', () => {
		expect(canTransition(TenantStatus.ACTIVE, TenantStatus.ACTIVE)).toBe(
			false,
		);
		expect(canTransition(TenantStatus.LOCKED, TenantStatus.SUSPENDED)).toBe(
			false,
		);
		expect(canTransition(TenantStatus.LOCKED, TenantStatus.LOCKED)).toBe(
			false,
		);
		expect(canTransition(TenantStatus.SUSPENDED, TenantStatus.SUSPENDED)).toBe(
			false,
		);
	});

	it('documents schema-grounded aggregate predicates', () => {
		expect(TENANT_DETAIL_AGGREGATES.usersRelation).toBe('users');
		expect(TENANT_DETAIL_AGGREGATES.subscriptionsRelation).toBe(
			'subscriptions',
		);
		expect(TENANT_DETAIL_AGGREGATES.supportTicketsRelation).toBe(
			'supportTickets',
		);
		expect(TENANT_DETAIL_AGGREGATES.openTicketStatuses).toEqual([
			'OPEN',
			'IN_PROGRESS',
		]);
	});
});
