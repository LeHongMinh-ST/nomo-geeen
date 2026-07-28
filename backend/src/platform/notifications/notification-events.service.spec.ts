import { NOTIFICATION_REDIS_CHANNEL } from './notification-events';
import { NotificationEventsService } from './notification-events.service';

describe('NotificationEventsService', () => {
	function build(redisOverrides: Record<string, unknown> = {}) {
		const redis = {
			publish: jest.fn().mockResolvedValue(1),
			duplicate: jest.fn().mockReturnValue({
				on: jest.fn(),
				connect: jest.fn().mockResolvedValue(undefined),
				subscribe: jest.fn().mockResolvedValue(undefined),
				quit: jest.fn().mockResolvedValue(undefined),
			}),
			...redisOverrides,
		};
		const service = new NotificationEventsService(redis as never);
		return { service, redis };
	}

	it('delivers tenant-wide events to every user of that tenant only', async () => {
		const { service, redis } = build();
		const t1u1: unknown[] = [];
		const t1u2: unknown[] = [];
		const t2u1: unknown[] = [];
		service.subscribe('tenant-1', 'user-1', (e) => t1u1.push(e));
		service.subscribe('tenant-1', 'user-2', (e) => t1u2.push(e));
		service.subscribe('tenant-2', 'user-1', (e) => t2u1.push(e));

		await service.publish({
			tenantId: 'tenant-1',
			userId: null,
			notificationId: 'n-wide',
			action: 'created',
		});

		expect(t1u1).toHaveLength(1);
		expect(t1u2).toHaveLength(1);
		expect(t2u1).toHaveLength(0);
		expect(t1u1[0]).toMatchObject({
			type: 'notification.changed',
			notificationId: 'n-wide',
			userId: null,
			action: 'created',
		});
		expect(redis.publish).toHaveBeenCalledWith(
			NOTIFICATION_REDIS_CHANNEL,
			expect.stringContaining('"notificationId":"n-wide"'),
		);
	});

	it('delivers user-targeted events only to that user', async () => {
		const { service } = build();
		const hits: string[] = [];
		service.subscribe('tenant-1', 'user-1', () => hits.push('u1'));
		service.subscribe('tenant-1', 'user-2', () => hits.push('u2'));

		await service.publish({
			tenantId: 'tenant-1',
			userId: 'user-2',
			notificationId: 'n-user',
			action: 'updated',
		});

		expect(hits).toEqual(['u2']);
	});

	it('cleans up listeners on unsubscribe (disconnect)', async () => {
		const { service } = build();
		const hits: number[] = [];
		const unsub = service.subscribe('tenant-1', 'user-1', () => hits.push(1));
		expect(service.connectionCount()).toBe(1);
		unsub();
		expect(service.connectionCount()).toBe(0);

		await service.publish({
			tenantId: 'tenant-1',
			userId: null,
			notificationId: 'n1',
			action: 'created',
		});
		expect(hits).toEqual([]);
	});

	it('still delivers locally when Redis publish fails', async () => {
		const { service } = build({
			publish: jest.fn().mockRejectedValue(new Error('redis down')),
		});
		const hits: string[] = [];
		service.subscribe('tenant-1', 'user-1', (e) => hits.push(e.notificationId));

		await service.publish({
			tenantId: 'tenant-1',
			userId: null,
			notificationId: 'n-local',
			action: 'created',
		});

		expect(hits).toEqual(['n-local']);
	});

	it('applies foreign Redis payloads and ignores same-origin echo', async () => {
		const handlers: Record<string, (...args: unknown[]) => void> = {};
		const sub = {
			on: jest.fn((event: string, cb: (...args: unknown[]) => void) => {
				handlers[event] = cb;
			}),
			connect: jest.fn().mockResolvedValue(undefined),
			subscribe: jest.fn().mockResolvedValue(undefined),
			quit: jest.fn().mockResolvedValue(undefined),
		};
		const publish = jest.fn(async (_channel: string, raw: string) => {
			handlers.message?.(NOTIFICATION_REDIS_CHANNEL, raw);
			return 1;
		});
		const { service } = build({
			duplicate: jest.fn().mockReturnValue(sub),
			publish,
		});
		await service.onModuleInit();
		expect(service.isRedisBridgeReady()).toBe(true);

		const hits: string[] = [];
		service.subscribe('tenant-1', 'user-1', (e) => hits.push(e.notificationId));

		// Local publish delivers once; Redis echo with same originId is ignored.
		await service.publish({
			tenantId: 'tenant-1',
			userId: null,
			notificationId: 'n-self',
			action: 'created',
		});
		expect(hits).toEqual(['n-self']);

		// Foreign instance payload is applied.
		handlers.message?.(
			NOTIFICATION_REDIS_CHANNEL,
			JSON.stringify({
				tenantId: 'tenant-1',
				userId: null,
				notificationId: 'from-other',
				action: 'created',
				originId: 'other-instance',
				at: '2026-07-28T00:00:00.000Z',
			}),
		);
		expect(hits).toEqual(['n-self', 'from-other']);
	});
});
