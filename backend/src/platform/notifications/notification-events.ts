/**
 * SSE / fan-out contract for tenant in-app notifications.
 * List + unread-count remain the source of truth; stream only signals change.
 */
export type NotificationChangeAction = 'created' | 'updated';

export type NotificationChangedEvent = {
	type: 'notification.changed';
	action: NotificationChangeAction;
	notificationId: string;
	/** null = tenant-wide audience (all users of tenant). */
	userId: string | null;
	at: string;
};

export type NotificationStreamClientEvent =
	| { type: 'connected'; at: string }
	| { type: 'heartbeat'; at: string }
	| (Omit<NotificationChangedEvent, 'userId'> & {
			/** Present only for debugging; clients should re-fetch list/unread. */
			audience: 'USER' | 'TENANT';
	  });

export type NotificationPublishInput = {
	tenantId: string;
	/** null = broadcast to every connected user in the tenant. */
	userId: string | null;
	notificationId: string;
	action: NotificationChangeAction;
};

export const NOTIFICATION_REDIS_CHANNEL = 'nomo:tenant-notifications';

export type NotificationRedisPayload = NotificationPublishInput & {
	/** Prevents double-delivery on the publishing instance. */
	originId: string;
	at: string;
};
