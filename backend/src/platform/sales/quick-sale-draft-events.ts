/**
 * SSE / fan-out contract for the server-side QuickSaleDraft cart.
 * Mirrors `notification-events.ts` so we can copy local+Redis pattern; kept
 * in its own module to avoid polluting the notification stream with cart
 * activity.
 */

export type QuickSaleDraftAction =
	| 'created'
	| 'line-added'
	| 'line-quantity-set'
	| 'line-removed'
	| 'customer-set'
	| 'expired'
	| 'closed'
	| 'checked-out';

export type QuickSaleDraftChangedEvent = {
	type: 'quick-sale-draft.changed';
	draftId: string;
	tenantId: string;
	actorUserId: string;
	action: QuickSaleDraftAction;
	revision: number;
	at: string;
};

export type QuickSaleDraftStreamClientEvent =
	| { type: 'connected'; at: string }
	| { type: 'heartbeat'; at: string }
	| QuickSaleDraftChangedEvent;

export type QuickSaleDraftPublishInput = {
	draftId: string;
	tenantId: string;
	actorUserId: string;
	action: QuickSaleDraftAction;
	revision: number;
};

export const QUICK_SALE_DRAFT_REDIS_CHANNEL = 'nomo:tenant-quick-sale-draft';

export type QuickSaleDraftRedisPayload = QuickSaleDraftPublishInput & {
	/** Prevents double-delivery on the publishing instance. */
	originId: string;
	at: string;
};
