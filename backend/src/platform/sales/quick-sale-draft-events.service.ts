import { randomUUID } from 'node:crypto';
import {
	Injectable,
	Logger,
	type OnModuleDestroy,
	type OnModuleInit,
} from '@nestjs/common';
import type Redis from 'ioredis';
import { RedisService } from '../redis/redis.service';
import {
	QUICK_SALE_DRAFT_REDIS_CHANNEL,
	type QuickSaleDraftChangedEvent,
	type QuickSaleDraftPublishInput,
	type QuickSaleDraftRedisPayload,
} from './quick-sale-draft-events';

export type QuickSaleDraftListener = (
	event: QuickSaleDraftChangedEvent,
) => void;

type LocalConnection = {
	tenantId: string;
	draftId: string;
	listener: QuickSaleDraftListener;
};

/**
 * Fan-out hub for QuickSaleDraft SSE.
 * - Keeps in-process subscribers for this instance (one per draft).
 * - Uses Redis pub/sub when available so multi-instance stays in sync.
 *
 * Mirrors the NotificationEventsService pattern; the only difference is
 * scoping to a single draft and broadcasting to all joined users.
 */
@Injectable()
export class QuickSaleDraftEventsService
	implements OnModuleInit, OnModuleDestroy
{
	private readonly logger = new Logger(QuickSaleDraftEventsService.name);
	private readonly originId = randomUUID();
	private readonly connections = new Map<string, LocalConnection>();
	private subscriber: Redis | null = null;
	private redisReady = false;

	constructor(private readonly redis: RedisService) {}

	async onModuleInit(): Promise<void> {
		await this.attachRedisSubscriber();
	}

	async onModuleDestroy(): Promise<void> {
		this.connections.clear();
		if (this.subscriber) {
			try {
				await this.subscriber.quit();
			} catch {
				// Best-effort shutdown.
			}
			this.subscriber = null;
		}
		this.redisReady = false;
	}

	subscribe(
		tenantId: string,
		draftId: string,
		listener: QuickSaleDraftListener,
	): () => void {
		const id = randomUUID();
		this.connections.set(id, { tenantId, draftId, listener });
		return () => {
			this.connections.delete(id);
		};
	}

	connectionCount(): number {
		return this.connections.size;
	}

	async publish(input: QuickSaleDraftPublishInput): Promise<void> {
		const at = new Date().toISOString();
		const event: QuickSaleDraftChangedEvent = {
			type: 'quick-sale-draft.changed',
			draftId: input.draftId,
			tenantId: input.tenantId,
			actorUserId: input.actorUserId,
			action: input.action,
			revision: input.revision,
			at,
		};
		this.deliverLocal(input.tenantId, input.draftId, event);

		const payload: QuickSaleDraftRedisPayload = {
			...input,
			originId: this.originId,
			at,
		};
		try {
			await this.redis.publish(
				QUICK_SALE_DRAFT_REDIS_CHANNEL,
				JSON.stringify(payload),
			);
		} catch (error) {
			this.logger.warn(
				`QuickSaleDraft Redis publish failed (in-process only): ${(error as Error).message}`,
			);
		}
	}

	isRedisBridgeReady(): boolean {
		return this.redisReady;
	}

	private deliverLocal(
		tenantId: string,
		draftId: string,
		event: QuickSaleDraftChangedEvent,
	): void {
		for (const conn of this.connections.values()) {
			if (conn.tenantId !== tenantId) continue;
			if (conn.draftId !== draftId) continue;
			try {
				conn.listener(event);
			} catch (error) {
				this.logger.warn(
					`QuickSaleDraft listener error: ${(error as Error).message}`,
				);
			}
		}
	}

	private async attachRedisSubscriber(): Promise<void> {
		try {
			const sub = this.redis.duplicate();
			sub.on('error', (err: Error) => {
				this.logger.warn(`QuickSaleDraft Redis sub error: ${err.message}`);
			});
			await sub.connect();
			await sub.subscribe(QUICK_SALE_DRAFT_REDIS_CHANNEL);
			sub.on('message', (channel: string, raw: string) => {
				if (channel !== QUICK_SALE_DRAFT_REDIS_CHANNEL) return;
				this.onRedisMessage(raw);
			});
			this.subscriber = sub;
			this.redisReady = true;
		} catch (error) {
			this.redisReady = false;
			this.logger.warn(
				`QuickSaleDraft Redis bridge disabled (in-process only): ${(error as Error).message}`,
			);
		}
	}

	private onRedisMessage(raw: string): void {
		let payload: QuickSaleDraftRedisPayload;
		try {
			payload = JSON.parse(raw) as QuickSaleDraftRedisPayload;
		} catch {
			return;
		}
		if (!payload?.tenantId || !payload?.draftId) return;
		if (payload.originId === this.originId) return;
		this.deliverLocal(payload.tenantId, payload.draftId, {
			type: 'quick-sale-draft.changed',
			draftId: payload.draftId,
			tenantId: payload.tenantId,
			actorUserId: payload.actorUserId,
			action: payload.action,
			revision: payload.revision,
			at: payload.at ?? new Date().toISOString(),
		});
	}
}
