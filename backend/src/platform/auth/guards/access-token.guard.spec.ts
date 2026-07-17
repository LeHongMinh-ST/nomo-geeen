import {
	type ExecutionContext,
	ServiceUnavailableException,
	UnauthorizedException,
} from '@nestjs/common';
import type { RefreshTokenStore } from '../refresh-token.store';
import { AccessTokenGuard } from './access-token.guard';

function ctxWith(authHeader?: string): ExecutionContext {
	const req = { headers: authHeader ? { authorization: authHeader } : {} };
	return {
		switchToHttp: () => ({ getRequest: () => req }),
	} as unknown as ExecutionContext;
}

describe('AccessTokenGuard', () => {
	it('rejects with 401 when the Authorization header is missing', async () => {
		const store = {
			isAccessBlacklisted: jest.fn(),
		} as unknown as RefreshTokenStore;
		const guard = new AccessTokenGuard(store);
		await expect(guard.canActivate(ctxWith())).rejects.toBeInstanceOf(
			UnauthorizedException,
		);
		expect(store.isAccessBlacklisted).not.toHaveBeenCalled();
	});

	it('rejects with 401 when the token is blacklisted', async () => {
		const store = {
			isAccessBlacklisted: jest.fn().mockResolvedValue(true),
		} as unknown as RefreshTokenStore;
		const guard = new AccessTokenGuard(store);
		await expect(
			guard.canActivate(ctxWith('Bearer revoked.token.here')),
		).rejects.toBeInstanceOf(UnauthorizedException);
		expect(store.isAccessBlacklisted).toHaveBeenCalledWith(
			'revoked.token.here',
		);
	});

	it('fails closed with 503 when the blacklist check throws (Redis down)', async () => {
		const store = {
			isAccessBlacklisted: jest
				.fn()
				.mockRejectedValue(new Error('ECONNREFUSED')),
		} as unknown as RefreshTokenStore;
		const guard = new AccessTokenGuard(store);
		await expect(
			guard.canActivate(ctxWith('Bearer some.token.here')),
		).rejects.toBeInstanceOf(ServiceUnavailableException);
	});
});
