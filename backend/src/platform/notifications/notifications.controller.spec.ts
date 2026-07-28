import { firstValueFrom, take } from 'rxjs';
import { NotificationEventsService } from './notification-events.service';
import { NotificationProducerService } from './notification-producer.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

describe('NotificationsController', () => {
	const user = { id: 'user-1', tenantId: 'tenant-1' };

	function makeReq() {
		const handlers: Record<string, () => void> = {};
		return {
			user,
			on: jest.fn((event: string, cb: () => void) => {
				handlers[event] = cb;
			}),
			_emit(event: string) {
				handlers[event]?.();
			},
		};
	}

	function build(eventsOverrides: Record<string, unknown> = {}) {
		const service = {
			list: jest.fn().mockResolvedValue({ items: [], unreadCount: 0 }),
			unreadCount: jest.fn().mockResolvedValue({ count: 2 }),
			markRead: jest.fn().mockResolvedValue({ id: 'n1' }),
			markAllRead: jest.fn().mockResolvedValue({ updated: 2, unreadCount: 0 }),
		};
		const producer = {
			syncTenant: jest.fn().mockResolvedValue({
				dayKey: '2026-07-28',
				created: 1,
				updated: 0,
				skipped: 2,
			}),
		};
		const events = {
			subscribe: jest.fn().mockReturnValue(jest.fn()),
			...eventsOverrides,
		};
		const controller = new NotificationsController(
			service as unknown as NotificationsService,
			producer as unknown as NotificationProducerService,
			events as unknown as NotificationEventsService,
		);
		return { controller, service, producer, events };
	}

	it('delegates list/unread/mark/sync to services', async () => {
		const { controller, service, producer } = build();
		const req = makeReq() as never;

		await controller.list(req, { limit: 10, unreadOnly: true });
		expect(service.list).toHaveBeenCalledWith('tenant-1', 'user-1', {
			limit: 10,
			unreadOnly: true,
		});

		await controller.unreadCount(req);
		expect(service.unreadCount).toHaveBeenCalledWith('tenant-1', 'user-1');

		await controller.sync(req);
		expect(producer.syncTenant).toHaveBeenCalledWith('tenant-1');

		await controller.markAllRead(req);
		expect(service.markAllRead).toHaveBeenCalledWith('tenant-1', 'user-1');

		await controller.markRead(req, '11111111-1111-1111-1111-111111111111');
		expect(service.markRead).toHaveBeenCalledWith(
			'tenant-1',
			'user-1',
			'11111111-1111-1111-1111-111111111111',
		);
	});

	it('streams connected + changed events for the authenticated tenant user', async () => {
		const captured: { listener: ((event: unknown) => void) | null } = {
			listener: null,
		};
		const unsub = jest.fn();
		const { controller, events } = build({
			subscribe: jest.fn(
				(_tenantId: string, _userId: string, cb: (event: unknown) => void) => {
					captured.listener = cb;
					return unsub;
				},
			),
		});
		const req = makeReq();
		const stream = controller.stream(req as never);

		const seen: unknown[] = [];
		const sub = stream.subscribe({
			next: (value) => seen.push(value.data),
		});

		// Allow microtask for connected event.
		await Promise.resolve();
		expect(events.subscribe).toHaveBeenCalledWith(
			'tenant-1',
			'user-1',
			expect.any(Function),
		);
		expect(seen[0]).toMatchObject({ type: 'connected' });

		expect(captured.listener).toBeTruthy();
		captured.listener?.({
			type: 'notification.changed',
			action: 'created',
			notificationId: 'n1',
			userId: null,
			at: '2026-07-28T00:00:00.000Z',
		});
		expect(seen[1]).toMatchObject({
			type: 'notification.changed',
			action: 'created',
			notificationId: 'n1',
			audience: 'TENANT',
		});

		sub.unsubscribe();
		expect(unsub).toHaveBeenCalled();
	});

	it('cleans up on request close (disconnect)', async () => {
		const unsub = jest.fn();
		const { controller } = build({
			subscribe: jest.fn().mockReturnValue(unsub),
		});
		const req = makeReq();
		const stream = controller.stream(req as never);
		const sub = stream.subscribe({ next: () => undefined });
		await firstValueFrom(stream.pipe(take(1))).catch(() => undefined);
		req._emit('close');
		// close completes the observable; unsubscribe still safe.
		sub.unsubscribe();
		expect(unsub).toHaveBeenCalled();
	});
});
