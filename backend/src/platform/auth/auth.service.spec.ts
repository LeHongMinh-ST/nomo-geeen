import {
	ForbiddenException,
	ServiceUnavailableException,
	UnauthorizedException,
} from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { AuthService, ttlToSeconds } from './auth.service';
import { DECOY_HASH, type PasswordService } from './password.service';
import type { RefreshTokenStore } from './refresh-token.store';
import type { TokenService } from './token.service';

describe('ttlToSeconds', () => {
	it('parses units', () => {
		expect(ttlToSeconds('30d')).toBe(2592000);
		expect(ttlToSeconds('15m')).toBe(900);
		expect(ttlToSeconds('3600s')).toBe(3600);
		expect(ttlToSeconds('2h')).toBe(7200);
		expect(ttlToSeconds('garbage')).toBe(2592000);
	});
});

describe('AuthService.login', () => {
	const activeAdmin = {
		id: 'a1',
		email: 'admin@nomogreen.vn',
		passwordHash: 'stored-hash',
		fullName: 'Root Admin',
		role: 'SUPER_ADMIN',
		status: 'ACTIVE',
	};

	// R0-02: loadAdminPermissions reads adminRoleAssignment + role.permission.
	// Default fixture: 1 SUPER_ADMIN assignment with 2 admin perm codes.
	const defaultAssignments = [
		{
			role: {
				code: 'SUPER_ADMIN',
				permissions: [
					{ permission: { code: 'admin.user:view' } },
					{ permission: { code: 'admin.role:create' } },
				],
			},
		},
	];
	const defaultSuperAdminRole = { id: 'role-super' };

	function build(overrides: {
		admin?: typeof activeAdmin | null;
		verifyResult?: boolean;
		assignments?: typeof defaultAssignments | [];
		assignmentCount?: number;
	}) {
		const prisma = {
			platformAdmin: {
				findUnique: jest
					.fn()
					.mockResolvedValue(
						overrides.admin === undefined ? activeAdmin : overrides.admin,
					),
				update: jest.fn().mockResolvedValue({}),
			},
			adminRoleAssignment: {
				findMany: jest
					.fn()
					.mockResolvedValue(
						overrides.assignments === undefined
							? defaultAssignments
							: overrides.assignments,
					),
				count: jest
					.fn()
					.mockResolvedValue(
						overrides.assignmentCount === undefined
							? overrides.assignments === undefined
								? 1
								: overrides.assignments.length
							: overrides.assignmentCount,
					),
				upsert: jest.fn().mockResolvedValue({}),
			},
			role: {
				findFirst: jest
					.fn()
					.mockResolvedValue(defaultSuperAdminRole),
			},
			$transaction: jest.fn(async (fnOrOps: unknown) => {
				// Interactive transaction signature: receives a function. Pass a
				// mock tx with relevant models and call fn(tx).
				if (typeof fnOrOps === 'function') {
					const tx = {
						auditLog: {
							create: jest.fn().mockResolvedValue({}),
						},
						platformAdmin: {
							create: jest.fn().mockResolvedValue({ id: 'admin-2' }),
							update: jest.fn().mockResolvedValue({}),
						},
						adminRoleAssignment: {
							createMany: jest.fn().mockResolvedValue({ count: 0 }),
							upsert: jest.fn().mockResolvedValue({}),
						},
						role: {
							findUniqueOrThrow: jest.fn(),
						},
					};
					return fnOrOps(tx);
				}
				// Array form: each item is either a Promise OR a function.
				if (Array.isArray(fnOrOps)) {
					for (const op of fnOrOps) {
						if (typeof op === 'function') {
							await op();
						} else if (op && typeof (op as Promise<unknown>).then === 'function') {
							await op;
						}
					}
					return [];
				}
				return [];
			}),
			auditLog: { create: jest.fn().mockResolvedValue({}) },
		} as unknown as PrismaService;
		const passwords = {
			verify: jest.fn().mockResolvedValue(overrides.verifyResult ?? true),
		} as unknown as PasswordService;
		const tokens = {
			signAccess: jest.fn().mockReturnValue('access.jwt'),
			signRefresh: jest.fn().mockReturnValue('refresh.jwt'),
		} as unknown as TokenService;
		const store = {
			open: jest.fn().mockResolvedValue(undefined),
		} as unknown as RefreshTokenStore;
		return {
			service: new AuthService(prisma, passwords, tokens, store),
			prisma,
			passwords,
			tokens,
			store,
		};
	}

	it('returns tokens + admin (with roleCodes + permissions) on valid active-admin login (DB before Redis)', async () => {
		const { service, prisma, store } = build({});
		const result = await service.login('admin@nomogreen.vn', 'pw', {
			ip: '1.2.3.4',
			userAgent: 'jest',
		});
		expect(result.accessToken).toBe('access.jwt');
		expect(result.refreshToken).toBe('refresh.jwt');
		expect(result.admin).toEqual({
			id: 'a1',
			email: 'admin@nomogreen.vn',
			role: 'SUPER_ADMIN',
			roleCodes: ['SUPER_ADMIN'],
			permissions: ['admin.user:view', 'admin.role:create'],
			fullName: 'Root Admin',
		});
		// lastLoginAt updated + audit written (with actor_role_code) + family opened
		expect(prisma.platformAdmin.update).toHaveBeenCalledTimes(1);
		expect(prisma.auditLog.create).toHaveBeenCalledWith({
			data: expect.objectContaining({
				actorType: 'PLATFORM_ADMIN',
				actorId: 'a1',
				actorRoleCode: 'SUPER_ADMIN',
				action: 'LOGIN',
				ipAddress: '1.2.3.4',
				userAgent: 'jest',
			}),
		});
		// F-09: store.open must receive adminId so the per-admin SET index is built.
		expect(store.open).toHaveBeenCalledWith(
			expect.any(String),
			expect.any(String),
			expect.any(Number),
			'a1',
		);
		// durable-first invariant: DB writes must happen BEFORE Redis store.open
		const updateOrder = (prisma.platformAdmin.update as jest.Mock).mock
			.invocationCallOrder[0];
		const auditOrder = (prisma.auditLog.create as jest.Mock).mock
			.invocationCallOrder[0];
		const openOrder = (store.open as jest.Mock).mock.invocationCallOrder[0];
		expect(updateOrder).toBeLessThan(openOrder);
		expect(auditOrder).toBeLessThan(openOrder);
	});

	it('throws 401 for a wrong password and does not open a family', async () => {
		const { service, store } = build({ verifyResult: false });
		await expect(
			service.login('admin@nomogreen.vn', 'bad', {}),
		).rejects.toBeInstanceOf(UnauthorizedException);
		expect(store.open).not.toHaveBeenCalled();
	});

	it('throws 401 for an unknown email and verifies the DECOY_HASH (constant time)', async () => {
		const { service, passwords, store } = build({ admin: null });
		await expect(
			service.login('nobody@nomogreen.vn', 'pw', {}),
		).rejects.toBeInstanceOf(UnauthorizedException);
		expect(passwords.verify).toHaveBeenCalledWith(DECOY_HASH, 'pw');
		expect(store.open).not.toHaveBeenCalled();
	});

	it('throws 403 for a DISABLED admin and issues no token', async () => {
		const { service, tokens, store } = build({
			admin: { ...activeAdmin, status: 'DISABLED' },
		});
		await expect(
			service.login('admin@nomogreen.vn', 'pw', {}),
		).rejects.toBeInstanceOf(ForbiddenException);
		expect(tokens.signAccess).not.toHaveBeenCalled();
		expect(store.open).not.toHaveBeenCalled();
	});

	it('fails closed with 503 when the Redis store throws during login', async () => {
		const { service, store } = build({});
		(store.open as jest.Mock).mockRejectedValue(new Error('ECONNREFUSED'));
		await expect(
			service.login('admin@nomogreen.vn', 'pw', {}),
		).rejects.toBeInstanceOf(ServiceUnavailableException);
	});

	it('R8.2: legacy SUPER_ADMIN with no assignments auto-creates row in transaction + upsert', async () => {
		const { service, prisma } = build({
			assignments: [],
			assignmentCount: 0,
		});
		const result = await service.login('admin@nomogreen.vn', 'pw', {});
		expect(result.admin.roleCodes).toEqual([]); // re-fetched after upsert returns empty for fresh admin
		expect(prisma.$transaction).toHaveBeenCalledTimes(1);
		// First call inside transaction is the upsert
		const upsertCalled = (prisma.adminRoleAssignment.upsert as jest.Mock).mock
			.calls.length;
		expect(upsertCalled).toBeGreaterThanOrEqual(1);
	});

	it('non-SUPER_ADMIN enum skips R8.2 auto-assignment', async () => {
		const { service, prisma } = build({
			admin: { ...activeAdmin, role: 'SUPPORT' },
			assignments: [],
			assignmentCount: 0,
		});
		await service.login('admin@nomogreen.vn', 'pw', {});
		expect(prisma.$transaction).not.toHaveBeenCalled();
	});
});
