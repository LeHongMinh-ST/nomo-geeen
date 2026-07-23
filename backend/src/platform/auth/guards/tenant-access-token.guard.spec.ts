import type { ExecutionContext } from '@nestjs/common';
import {
	ServiceUnavailableException,
	UnauthorizedException,
} from '@nestjs/common';
import type { RefreshTokenStore } from '../refresh-token.store';
import { TenantAccessTokenGuard } from './tenant-access-token.guard';

function ctxWith(
	authHeader?: string,
	user?: { id: string; tenantId: string },
): ExecutionContext {
	const req = {
		headers: authHeader ? { authorization: authHeader } : {},
		user,
	};
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

	it('allows active users whose password change flag is set', async () => {
		const store = {
			isUserAccessBlacklisted: jest.fn().mockResolvedValue(false),
		} as unknown as RefreshTokenStore;
		const prisma = {
			user: {
				findFirst: jest.fn().mockResolvedValue({
					id: 'user-1',
					mustChangePassword: true,
				}),
			},
		};
		const parentCanActivate = jest
			.spyOn(
				Object.getPrototypeOf(TenantAccessTokenGuard.prototype),
				'canActivate',
			)
			.mockResolvedValue(true);
		const guard = new TenantAccessTokenGuard(store, prisma as never);

		await expect(
			guard.canActivate(
				ctxWith('Bearer tenant.access.token', {
					id: 'user-1',
					tenantId: 'tenant-1',
				}),
			),
		).resolves.toBe(true);
		parentCanActivate.mockRestore();
	});
});
