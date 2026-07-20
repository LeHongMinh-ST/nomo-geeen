import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PrismaService } from '../../prisma/prisma.service';
import { TenantPermissionGuard } from './tenant-permission.guard';

function context(user?: { id: string; tenantId: string }): ExecutionContext {
	const request = { user };
	return {
		switchToHttp: () => ({ getRequest: () => request }),
		getHandler: () => 'handler',
		getClass: () => 'class',
	} as unknown as ExecutionContext;
}

describe('TenantPermissionGuard', () => {
	it('rejects requests without a verified tenant identity', async () => {
		const reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
		const prisma = {} as PrismaService;
		const guard = new TenantPermissionGuard(reflector, prisma);

		await expect(guard.canActivate(context())).rejects.toBeInstanceOf(
			UnauthorizedException,
		);
	});

	it('denies a missing tenant permission from current role grants', async () => {
		const reflector = {
			getAllAndOverride: jest.fn().mockReturnValue(['product:create']),
		} as unknown as Reflector;
		const prisma = {
			user: {
				findFirst: jest.fn().mockResolvedValue({
					role: { permissions: [{ permission: { code: 'product:view' } }] },
				}),
			},
		} as unknown as PrismaService;
		const guard = new TenantPermissionGuard(reflector, prisma);

		await expect(
			guard.canActivate(context({ id: 'user-1', tenantId: 'tenant-1' })),
		).rejects.toBeInstanceOf(ForbiddenException);
		expect(prisma.user.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: 'user-1', tenantId: 'tenant-1' }),
			}),
		);
	});

	it('allows a permission granted by the server-side tenant role', async () => {
		const reflector = {
			getAllAndOverride: jest.fn().mockReturnValue(['product:view']),
		} as unknown as Reflector;
		const prisma = {
			user: {
				findFirst: jest.fn().mockResolvedValue({
					role: { permissions: [{ permission: { code: 'product:view' } }] },
				}),
			},
		} as unknown as PrismaService;
		const guard = new TenantPermissionGuard(reflector, prisma);

		await expect(
			guard.canActivate(context({ id: 'user-1', tenantId: 'tenant-1' })),
		).resolves.toBe(true);
	});
});
