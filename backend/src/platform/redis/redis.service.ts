import {
	Injectable,
	type OnModuleDestroy,
	type OnModuleInit,
} from '@nestjs/common';
import Redis from 'ioredis';

/**
 * Wrapper mong quanh ioredis cho token state (refresh family + access blacklist).
 * Ket noi lazy; loi ket noi duoc surface de guard/endpoint fail closed (R9.1),
 * khong nuot loi de tranh cap quyen tren token state khong xac minh duoc.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
	private readonly client: Redis;

	constructor() {
		const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
		this.client = new Redis(url, {
			lazyConnect: true,
			maxRetriesPerRequest: 2,
		});
		// Tranh unhandled error event lam sap process; loi thuc su surface tai call site.
		this.client.on('error', (err) => {
			// Khong log credential; chi log message.
			console.error(`[RedisService] connection error: ${err.message}`);
		});
	}

	async onModuleInit(): Promise<void> {
		try {
			await this.client.connect();
		} catch (err) {
			// Fail-open o boot (lazy): call site se fail closed neu Redis chua san sang.
			console.error(
				`[RedisService] initial connect failed: ${(err as Error).message}`,
			);
		}
	}

	async onModuleDestroy(): Promise<void> {
		await this.client.quit();
	}

	async ping(): Promise<string> {
		return this.client.ping();
	}

	async get(key: string): Promise<string | null> {
		return this.client.get(key);
	}

	async set(key: string, value: string, ttlSec: number): Promise<void> {
		await this.client.set(key, value, 'EX', Math.max(1, ttlSec));
	}

	async del(...keys: string[]): Promise<number> {
		if (keys.length === 0) return 0;
		return this.client.del(...keys);
	}

	async ttl(key: string): Promise<number> {
		return this.client.ttl(key);
	}

	// SET wrappers used by RefreshTokenStore admin-index (F-09/F-18) — atomic,
	// no scripting needed because we don't compose multi-key writes.
	async sadd(key: string, member: string): Promise<number> {
		return this.client.sadd(key, member);
	}

	async srem(key: string, member: string): Promise<number> {
		return this.client.srem(key, member);
	}

	async smembers(key: string): Promise<string[]> {
		return this.client.smembers(key);
	}

	/**
	 * Chay Lua script atomic (dung cho rotation compare-and-swap o R3-01).
	 */
	async eval(
		script: string,
		numKeys: number,
		...args: (string | number)[]
	): Promise<unknown> {
		return this.client.eval(script, numKeys, ...args);
	}
}
