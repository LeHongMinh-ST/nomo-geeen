import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard', () => {
	let reflector: Reflector;
	let guard: PermissionGuard;
	const buildCtx = (metadata: string[] | undefined, user: unknown) => {
		const ctx = {
			getHandler: jest.fn(),
			getClass: jest.fn(),
			switchToHttp: () => ({
				getRequest: () => ({ user }),
			}),
		} as unknown as ExecutionContext;
		(reflector.getAllAndOverride as jest.Mock).mockReturnValue(metadata);
		return ctx;
	};

	beforeEach(() => {
		reflector = { getAllAndOverride: jest.fn() } as unknown as Reflector;
		guard = new PermissionGuard(reflector);
	});

	it('allows when no @RequirePermission metadata is set on the route', () => {
		const ctx = buildCtx(undefined, {
			id: 'a1',
			email: 'x',
			role: 'SUPPORT',
			roleCodes: ['SUPPORT'],
			permissions: [],
		});
		expect(guard.canActivate(ctx)).toBe(true);
	});

	it('allows when no required codes (empty array)', () => {
		const ctx = buildCtx([], {
			id: 'a1',
			email: 'x',
			role: 'SUPPORT',
			roleCodes: ['SUPPORT'],
			permissions: [],
		});
		expect(guard.canActivate(ctx)).toBe(true);
	});

	it('throws 401 when req.user is missing (R4.4)', () => {
		const ctx = buildCtx(['admin.user:view'], undefined);
		expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
	});

	it('allows SUPER_ADMIN shortcut regardless of permissions[] (R4.2)', () => {
		const ctx = buildCtx(['admin.user:view', 'admin.role:create'], {
			id: 'a1',
			email: 'x',
			role: 'SUPER_ADMIN',
			roleCodes: ['SUPER_ADMIN'],
			permissions: [],
		});
		expect(guard.canActivate(ctx)).toBe(true);
	});

	it('throws 403 with `missing` list when ANY required code is absent (R4.1 + R4.3 AND)', () => {
		const ctx = buildCtx(
			['admin.user:view', 'admin.user:edit', 'admin.user:delete'],
			{
				id: 'a1',
				email: 'x',
				role: 'SUPPORT',
				roleCodes: ['SUPPORT'],
				permissions: ['admin.user:view', 'admin.user:edit'],
			},
		);
		expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
		try {
			guard.canActivate(ctx);
		} catch (err) {
			expect((err as ForbiddenException).getResponse()).toEqual({
				reason: 'PERMISSION_DENIED',
				missing: ['admin.user:delete'],
			});
		}
	});

	it('allows when ALL required codes are present (R4.3 AND)', () => {
		const ctx = buildCtx(['admin.user:view', 'admin.user:edit'], {
			id: 'a1',
			email: 'x',
			role: 'SUPPORT',
			roleCodes: ['SUPPORT'],
			permissions: ['admin.user:view', 'admin.user:edit', 'admin.role:create'],
		});
		expect(guard.canActivate(ctx)).toBe(true);
	});

	it('defensively handles missing permissions array', () => {
		const ctx = buildCtx(['admin.user:view'], {
			id: 'a1',
			email: 'x',
			role: 'SUPPORT',
			roleCodes: ['SUPPORT'],
			// permissions undefined — should not crash
		});
		expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
	});
});