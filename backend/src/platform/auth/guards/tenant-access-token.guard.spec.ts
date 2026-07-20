import type { ExecutionContext } from '@nestjs/common';
import {
	ServiceUnavailableException,
	UnauthorizedException,
} from '@nestjs/common';
import type { RefreshTokenStore } from '../refresh-token.store';
import { TenantAccessTokenGuard } from './tenant-access-token.guard';

function ctxWith(authHeader?: string): ExecutionContext {
	const req = { headers: authHeader ? { authorization: authHeader } : {} };
	return {
		switchToHttp: () => ({ getRequest: () => req }),
	} as unknown as ExecutionContext;
}

describe('TenantAccessTokenGuard', () => {
	it('rejects missing bearer tokens before touching Redis', async () => {
		const store = {
			isUserAccessBlacklisted: jest.fn(),
		} as unknown as RefreshTokenStore;
		const guard = new TenantAccessTokenGuard(store, undefined as never);

		await expect(guard.canActivate(ctxWith())).rejects.toBeInstanceOf(
			UnauthorizedException,
		);
		expect(store.isUserAccessBlacklisted).not.toHaveBeenCalled();
	});

	it('rejects blacklisted tenant access tokens', async () => {
		const store = {
			isUserAccessBlacklisted: jest.fn().mockResolvedValue(true),
		} as unknown as RefreshTokenStore;
		const guard = new TenantAccessTokenGuard(store, undefined as never);

		await expect(
			guard.canActivate(ctxWith('Bearer tenant.access.token')),
		).rejects.toBeInstanceOf(UnauthorizedException);
		expect(store.isUserAccessBlacklisted).toHaveBeenCalledWith(
			'tenant.access.token',
		);
	});

	it('fails closed when Redis is unavailable', async () => {
		const store = {
			isUserAccessBlacklisted: jest
				.fn()
				.mockRejectedValue(new Error('ECONNREFUSED')),
		} as unknown as RefreshTokenStore;
		const guard = new TenantAccessTokenGuard(store, undefined as never);

		await expect(
			guard.canActivate(ctxWith('Bearer tenant.access.token')),
		).rejects.toBeInstanceOf(ServiceUnavailableException);
	});
});
