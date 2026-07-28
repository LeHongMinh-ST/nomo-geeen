import { ExecutionContext } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';

const context = (path: string): ExecutionContext =>
	({
		switchToHttp: () => ({
			getRequest: () => ({
				path,
				method: 'POST',
				ip: '127.0.0.1',
				get: () => undefined,
			}),
		}),
	}) as never;

describe('RateLimitGuard', () => {
	it('allows non-sensitive routes without Redis access', async () => {
		const redis = { eval: jest.fn() };
		await expect(
			new RateLimitGuard(redis as never).canActivate(
				context('/tenant/products'),
			),
		).resolves.toBe(true);
		expect(redis.eval).not.toHaveBeenCalled();
	});
	it('rejects auth requests over the configured counter', async () => {
		const redis = { eval: jest.fn().mockResolvedValue(11) };
		await expect(
			new RateLimitGuard(redis as never).canActivate(context('/auth/login')),
		).rejects.toThrow('Rate limit exceeded');
	});
});
