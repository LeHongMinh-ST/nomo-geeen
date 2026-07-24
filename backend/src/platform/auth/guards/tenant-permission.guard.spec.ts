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
		const audit = { log: jest.fn() };
		const guard = new TenantPermissionGuard(reflector, prisma, audit as never);

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
		const audit = { log: jest.fn().mockResolvedValue(undefined) };
		const guard = new TenantPermissionGuard(reflector, prisma, audit as never);

		await expect(
			guard.canActivate(context({ id: 'user-1', tenantId: 'tenant-1' })),
		).rejects.toBeInstanceOf(ForbiddenException);
		expect(prisma.user.findFirst).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ id: 'user-1', tenantId: 'tenant-1' }),
			}),
		);
		expect(audit.log).toHaveBeenCalledWith(
			expect.objectContaining({
				tenantId: 'tenant-1',
				actorId: 'user-1',
				action: 'PERMISSION_DENIED',
				after: expect.objectContaining({
					missing: ['product:create'],
					outcome: 'denied',
				}),
			}),
		);
	});

	it('preserves 403 when denial audit storage fails without recursion', async () => {
		const reflector = {
			getAllAndOverride: jest.fn().mockReturnValue(['product:create']),
		} as unknown as Reflector;
		const prisma = {
			user: {
				findFirst: jest.fn().mockResolvedValue({
					role: { permissions: [] },
				}),
			},
		} as unknown as PrismaService;
		const audit = { log: jest.fn().mockRejectedValue(new Error('audit down')) };
		const guard = new TenantPermissionGuard(reflector, prisma, audit as never);

		await expect(
			guard.canActivate(context({ id: 'user-1', tenantId: 'tenant-1' })),
		).rejects.toBeInstanceOf(ForbiddenException);
		expect(audit.log).toHaveBeenCalledTimes(1);
	});

	it('preserves bounded permission counts and truncation markers', async () => {
		const required = Array.from(
			{ length: 102 },
			(_, index) => 'permission:' + index,
		);
		const reflector = {
			getAllAndOverride: jest.fn().mockReturnValue(required),
		} as unknown as Reflector;
		const prisma = {
			user: {
				findFirst: jest.fn().mockResolvedValue({
					role: { permissions: [{ permission: { code: required[0] } }] },
				}),
			},
		} as unknown as PrismaService;
		const audit = { log: jest.fn().mockResolvedValue(undefined) };
		const guard = new TenantPermissionGuard(reflector, prisma, audit as never);

		await expect(
			guard.canActivate(context({ id: 'user-1', tenantId: 'tenant-1' })),
		).rejects.toBeInstanceOf(ForbiddenException);
		const after = audit.log.mock.calls[0][0].after;
		expect(after.required).toEqual({
			items: required.slice(0, 100),
			count: 102,
			truncated: true,
		});
		expect(after.missing).toEqual({
			items: required.slice(1, 101),
			count: 101,
			truncated: true,
		});
	});

	it('preserves 401 for an inactive or foreign identity without writing an audit row', async () => {
		const reflector = {
			getAllAndOverride: jest.fn().mockReturnValue(['product:view']),
		} as unknown as Reflector;
		const prisma = {
			user: { findFirst: jest.fn().mockResolvedValue(null) },
		} as unknown as PrismaService;
		const audit = { log: jest.fn().mockResolvedValue(undefined) };
		const guard = new TenantPermissionGuard(reflector, prisma, audit as never);

		await expect(
			guard.canActivate(context({ id: 'user-foreign', tenantId: 'tenant-1' })),
		).rejects.toBeInstanceOf(UnauthorizedException);
		expect(audit.log).not.toHaveBeenCalled();
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
		const audit = { log: jest.fn() };
		const guard = new TenantPermissionGuard(reflector, prisma, audit as never);

		await expect(
			guard.canActivate(context({ id: 'user-1', tenantId: 'tenant-1' })),
		).resolves.toBe(true);
	});
});
