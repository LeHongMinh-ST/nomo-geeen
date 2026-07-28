import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export type ReadyCheck = {
	status: 'up' | 'down' | 'degraded';
	latencyMs?: number;
	error?: string;
};

@Injectable()
export class HealthService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly redis: RedisService,
	) {}

	async ready() {
		const [database, redis] = await Promise.all([
			this.checkDatabase(),
			this.checkRedis(),
		]);
		const status =
			database.status === 'up' && redis.status === 'up'
				? 'ready'
				: database.status === 'up'
					? 'degraded'
					: 'down';
		return {
			status,
			checks: { database, redis },
			timestamp: new Date().toISOString(),
		};
	}

	private async checkDatabase(): Promise<ReadyCheck> {
		const started = Date.now();
		try {
			await this.prisma.$queryRaw`SELECT 1`;
			return { status: 'up', latencyMs: Date.now() - started };
		} catch (error) {
			return {
				status: 'down',
				latencyMs: Date.now() - started,
				error: (error as Error).message,
			};
		}
	}

	private async checkRedis(): Promise<ReadyCheck> {
		const started = Date.now();
		try {
			await this.redis.ping();
			return { status: 'up', latencyMs: Date.now() - started };
		} catch (error) {
			return {
				status: 'degraded',
				latencyMs: Date.now() - started,
				error: (error as Error).message,
			};
		}
	}
}
