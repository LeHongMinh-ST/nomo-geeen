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
	NOTIFICATION_REDIS_CHANNEL,
	type NotificationChangedEvent,
	type NotificationPublishInput,
	type NotificationRedisPayload,
} from './notification-events';

export type NotificationListener = (event: NotificationChangedEvent) => void;

type LocalConnection = {
	tenantId: string;
	userId: string;
	listener: NotificationListener;
};

/**
 * Fan-out hub for tenant notification SSE.
 * - Always keeps in-process subscribers for this instance.
 * - Uses Redis pub/sub when available so multi-instance deployments stay in sync.
 * - Isolation: tenant-wide (userId null) → all users of tenant; user-targeted → that user only.
 */
@Injectable()
export class NotificationEventsService
	implements OnModuleInit, OnModuleDestroy
{
	private readonly logger = new Logger(NotificationEventsService.name);
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

	/**
	 * Register an SSE connection for one authenticated tenant user.
	 * Returns unsubscribe that must run on disconnect/complete.
	 */
	subscribe(
		tenantId: string,
		userId: string,
		listener: NotificationListener,
	): () => void {
		const id = randomUUID();
		this.connections.set(id, { tenantId, userId, listener });
		return () => {
			this.connections.delete(id);
		};
	}

	/** Active local SSE connections — useful for tests and ops. */
	connectionCount(): number {
		return this.connections.size;
	}

	/**
	 * Publish a change for one notification row.
	 * Delivers locally immediately; also publishes to Redis for other instances.
	 * Same-instance Redis echo is ignored via originId.
	 */
	async publish(input: NotificationPublishInput): Promise<void> {
		const at = new Date().toISOString();
		const event: NotificationChangedEvent = {
			type: 'notification.changed',
			action: input.action,
			notificationId: input.notificationId,
			userId: input.userId,
			at,
		};
		this.deliverLocal(input.tenantId, event);

		const payload: NotificationRedisPayload = {
			...input,
			originId: this.originId,
			at,
		};
		try {
			await this.redis.publish(
				NOTIFICATION_REDIS_CHANNEL,
				JSON.stringify(payload),
			);
		} catch (error) {
			// Multi-instance fan-out is best-effort; local delivery already happened.
			this.logger.warn(
				`Redis publish failed (in-process only): ${(error as Error).message}`,
			);
		}
	}

	/** Test helper: whether Redis subscriber attached successfully. */
	isRedisBridgeReady(): boolean {
		return this.redisReady;
	}

	private deliverLocal(
		tenantId: string,
		event: NotificationChangedEvent,
	): void {
		for (const conn of this.connections.values()) {
			if (conn.tenantId !== tenantId) continue;
			// Tenant-wide (null) reaches every user in tenant; user rows only that user.
			if (event.userId !== null && event.userId !== conn.userId) continue;
			try {
				conn.listener(event);
			} catch (error) {
				this.logger.warn(
					`Notification listener error: ${(error as Error).message}`,
				);
			}
		}
	}

	private async attachRedisSubscriber(): Promise<void> {
		try {
			const sub = this.redis.duplicate();
			sub.on('error', (err) => {
				this.logger.warn(`Notification Redis sub error: ${err.message}`);
			});
			await sub.connect();
			await sub.subscribe(NOTIFICATION_REDIS_CHANNEL);
			sub.on('message', (channel, raw) => {
				if (channel !== NOTIFICATION_REDIS_CHANNEL) return;
				this.onRedisMessage(raw);
			});
			this.subscriber = sub;
			this.redisReady = true;
		} catch (error) {
			this.redisReady = false;
			this.logger.warn(
				`Notification Redis bridge disabled (in-process only): ${(error as Error).message}`,
			);
		}
	}

	private onRedisMessage(raw: string): void {
		let payload: NotificationRedisPayload;
		try {
			payload = JSON.parse(raw) as NotificationRedisPayload;
		} catch {
			return;
		}
		if (!payload?.tenantId || !payload.notificationId) return;
		// Origin instance already delivered locally on publish.
		if (payload.originId === this.originId) return;
		this.deliverLocal(payload.tenantId, {
			type: 'notification.changed',
			action: payload.action,
			notificationId: payload.notificationId,
			userId: payload.userId ?? null,
			at: payload.at ?? new Date().toISOString(),
		});
	}
}
