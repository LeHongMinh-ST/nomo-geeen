import { QUICK_SALE_DRAFT_REDIS_CHANNEL } from './quick-sale-draft-events';
import { QuickSaleDraftEventsService } from './quick-sale-draft-events.service';

describe('QuickSaleDraftEventsService', () => {
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
		const service = new QuickSaleDraftEventsService(redis as never);
		return { service, redis };
	}

	it('delivers events only to listeners on the same draft of the same tenant', async () => {
		const { service, redis } = build();
		const t1dA: unknown[] = [];
		const t1dB: unknown[] = [];
		const t2dA: unknown[] = [];
		service.subscribe('tenant-1', 'draft-A', (e) => t1dA.push(e));
		service.subscribe('tenant-1', 'draft-B', (e) => t1dB.push(e));
		service.subscribe('tenant-2', 'draft-A', (e) => t2dA.push(e));

		await service.publish({
			draftId: 'draft-A',
			tenantId: 'tenant-1',
			actorUserId: 'user-1',
			action: 'line-added',
			revision: 2,
		});

		expect(t1dA).toHaveLength(1);
		expect(t1dB).toHaveLength(0);
		expect(t2dA).toHaveLength(0);
		expect(t1dA[0]).toMatchObject({
			type: 'quick-sale-draft.changed',
			draftId: 'draft-A',
			tenantId: 'tenant-1',
			actorUserId: 'user-1',
			action: 'line-added',
			revision: 2,
		});
		expect(redis.publish).toHaveBeenCalledWith(
			QUICK_SALE_DRAFT_REDIS_CHANNEL,
			expect.stringContaining('"action":"line-added"'),
		);
	});

	it('removes the listener on unsubscribe', async () => {
		const { service } = build();
		const hits: number[] = [];
		const unsub = service.subscribe('tenant-1', 'draft-A', () => hits.push(1));
		expect(service.connectionCount()).toBe(1);
		unsub();
		expect(service.connectionCount()).toBe(0);

		await service.publish({
			draftId: 'draft-A',
			tenantId: 'tenant-1',
			actorUserId: 'user-1',
			action: 'created',
			revision: 1,
		});
		expect(hits).toHaveLength(0);
	});

	it('falls back to in-process when Redis subscriber fails to attach', () => {
		const { service } = build({
			duplicate: jest.fn().mockImplementation(() => {
				throw new Error('connect refused');
			}),
		});
		// publish must not throw even when Redis bridge is dead.
		return service
			.publish({
				draftId: 'draft-A',
				tenantId: 'tenant-1',
				actorUserId: 'user-1',
				action: 'created',
				revision: 1,
			})
			.then(() => {
				expect(service.isRedisBridgeReady()).toBe(false);
			});
	});
});
