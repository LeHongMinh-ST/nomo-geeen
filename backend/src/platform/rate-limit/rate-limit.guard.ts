import {
	type CanActivate,
	type ExecutionContext,
	HttpException,
	HttpStatus,
	Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { RedisService } from '../redis/redis.service';

const LIMITS: Record<string, { limit: number; windowSec: number }> = {
	'/auth/login': {
		limit: Number(process.env.AUTH_LOGIN_RATE_LIMIT ?? 10),
		windowSec: 60,
	},
	'/auth/refresh': {
		limit: Number(process.env.AUTH_REFRESH_RATE_LIMIT ?? 30),
		windowSec: 60,
	},
};

@Injectable()
export class RateLimitGuard implements CanActivate {
	constructor(private readonly redis: RedisService) {}
	async canActivate(context: ExecutionContext) {
		const request = context.switchToHttp().getRequest<Request>();
		const policy = LIMITS[request.path];
		if (!policy || request.method !== 'POST') return true;
		const address = request.ip ?? request.get('x-forwarded-for') ?? 'unknown';
		const key = `rl:${request.path}:${address}`;
		try {
			const result = Number(
				await this.redis.eval(
					"local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return n",
					1,
					key,
					policy.windowSec,
				),
			);
			if (result > policy.limit)
				throw new HttpException(
					'Rate limit exceeded',
					HttpStatus.TOO_MANY_REQUESTS,
				);
		} catch (error) {
			if (
				error instanceof HttpException &&
				error.getStatus() === HttpStatus.TOO_MANY_REQUESTS
			)
				throw error;
			// Existing auth contract is fail-open when Redis is unavailable; readiness exposes degraded state.
		}
		return true;
	}
}
