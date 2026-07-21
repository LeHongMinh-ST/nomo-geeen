import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AuditAction, Prisma } from '@prisma/client';
import { TenantUsersService } from './tenant-users.service';

const TENANT_ID = '11111111-1111-4111-8111-111111111111';
const USER_ID = '22222222-2222-4222-8222-222222222222';

const now = new Date('2026-07-19T00:00:00.000Z');

function userRow(overrides: Record<string, unknown> = {}) {
	return {
		id: USER_ID,
		tenantId: TENANT_ID,
		fullName: 'Nguyen Van A',
		username: 'nguyenvana',
		phone: null,
		email: null,
		status: 'ACTIVE',
		mustChangePassword: false,
		lastLoginAt: null,
		createdAt: now,
		updatedAt: now,
		role: { code: 'STAFF' },
		...overrides,
	};
}

describe('TenantUsersService', () => {
	const prisma = {
		tenant: { findFirst: jest.fn(), findUnique: jest.fn() },
		user: {
			findFirst: jest.fn(),
			findMany: jest.fn(),
			count: jest.fn(),
			create: jest.fn(),
			update: jest.fn(),
		},
		role: { findFirst: jest.fn() },
		subscription: { findFirst: jest.fn() },
		$transaction: jest.fn(),
	};

	const audit = { run: jest.fn(), log: jest.fn(), writeInTx: jest.fn() };
	const passwords = { hash: jest.fn(), verify: jest.fn(), generate: jest.fn() };

	const ctx = {
		actorId: 'admin-1',
		actorRoleCode: 'SUPER_ADMIN',
		ipAddress: '127.0.0.1',
		userAgent: 'jest',
	};

	let service: TenantUsersService;

	beforeEach(() => {
		jest.clearAllMocks();
		// $transaction(fn, opts) → run callback against the same prisma mock.
		prisma.$transaction.mockImplementation(
			async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma),
		);
		audit.writeInTx.mockResolvedValue(undefined);
		passwords.hash.mockResolvedValue('hashed');
		passwords.generate.mockReturnValue('Generated-Pass-123');
		service = new TenantUsersService(
			prisma as never,
			passwords as never,
			audit as never,
		);
	});

	function mockTenantExists() {
		prisma.tenant.findFirst.mockResolvedValue({ id: TENANT_ID });
	}

	function mockSeat(activeCount: number, maxUsers: number, seatBonus = 0) {
		prisma.tenant.findUnique.mockResolvedValue({ seatBonus });
		prisma.user.count.mockResolvedValue(activeCount);
		prisma.subscription.findFirst.mockResolvedValue({
			plan: { code: 'PRO', maxUsers },
		});
	}

	describe('list', () => {
		it('returns public rows (no passwordHash) plus seat usage', async () => {
			mockTenantExists();
			prisma.user.findMany.mockResolvedValue([userRow()]);
			prisma.user.count.mockResolvedValueOnce(1); // list total
			mockSeat(1, 10, 2);

			const result = await service.list(TENANT_ID, { page: 1, pageSize: 50 });

			expect(result.items[0]).not.toHaveProperty('passwordHash');
			expect(result.items[0].roleCode).toBe('STAFF');
			expect(result.seatUsage).toEqual({
				activeCount: 1,
				effectiveMaxUsers: 12,
				planCode: 'PRO',
				seatBonus: 2,
			});
		});

		it('caps an excessively large page to keep skip bounded', async () => {
			mockTenantExists();
			prisma.user.findMany.mockResolvedValue([]);
			prisma.user.count.mockResolvedValue(0);
			mockSeat(0, 10);

			const result = await service.list(TENANT_ID, {
				page: Number.MAX_SAFE_INTEGER,
				pageSize: 50,
			});

			expect(result.page).toBe(1_000_000);
			expect(prisma.user.findMany).toHaveBeenCalledWith(
				expect.objectContaining({ skip: (1_000_000 - 1) * 50 }),
			);
		});

		it('caps pageSize at 100', async () => {
			mockTenantExists();
			prisma.user.findMany.mockResolvedValue([]);
			prisma.user.count.mockResolvedValue(0);
			mockSeat(0, 10);

			const result = await service.list(TENANT_ID, {
				page: 1,
				pageSize: 5000,
			});

			expect(result.pageSize).toBe(100);
			expect(prisma.user.findMany).toHaveBeenCalledWith(
				expect.objectContaining({ take: 100 }),
			);
		});

		it('404 when tenant missing', async () => {
			prisma.tenant.findFirst.mockResolvedValue(null);
			await expect(
				service.list(TENANT_ID, { page: 1, pageSize: 50 }),
			).rejects.toBeInstanceOf(NotFoundException);
		});
	});

	describe('create', () => {
		it('creates ACTIVE user + USER_CREATE audit inside serializable tx', async () => {
			mockTenantExists();
			mockSeat(1, 10);
			prisma.role.findFirst.mockResolvedValue({ id: 'role-staff' });
			prisma.user.create.mockResolvedValue(userRow());

			const result = await service.create(
				TENANT_ID,
				{
					fullName: 'A',
					username: 'u',
					roleCode: 'STAFF',
					password: 'Abcd1234!xyz',
				} as never,
				ctx,
			);

			expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
				isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
			});
			expect(audit.writeInTx).toHaveBeenCalledWith(
				prisma,
				expect.objectContaining({ action: AuditAction.USER_CREATE }),
			);
			expect(result.generatedPassword).toBeNull();
		});

		it('returns generated password when generatePassword=true', async () => {
			mockTenantExists();
			mockSeat(0, 10);
			prisma.role.findFirst.mockResolvedValue({ id: 'role-staff' });
			prisma.user.create.mockResolvedValue(userRow());

			const result = await service.create(
				TENANT_ID,
				{
					fullName: 'A',
					username: 'u',
					roleCode: 'STAFF',
					generatePassword: true,
				} as never,
				ctx,
			);

			expect(result.generatedPassword).toBe('Generated-Pass-123');
		});

		it('rejects both password and generatePassword', async () => {
			mockTenantExists();
			await expect(
				service.create(
					TENANT_ID,
					{
						fullName: 'A',
						username: 'u',
						roleCode: 'STAFF',
						password: 'Abcd1234!xyz',
						generatePassword: true,
					} as never,
					ctx,
				),
			).rejects.toBeInstanceOf(BadRequestException);
		});

		it('409 SEAT_LIMIT_REACHED when active >= effective max', async () => {
			mockTenantExists();
			mockSeat(10, 10);
			prisma.role.findFirst.mockResolvedValue({ id: 'role-staff' });

			await expect(
				service.create(
					TENANT_ID,
					{
						fullName: 'A',
						username: 'u',
						roleCode: 'STAFF',
						generatePassword: true,
					} as never,
					ctx,
				),
			).rejects.toMatchObject({
				response: { reason: 'SEAT_LIMIT_REACHED' },
			});
		});

		it('maps P2002(username) to 409 USERNAME_TAKEN', async () => {
			mockTenantExists();
			mockSeat(0, 10);
			prisma.role.findFirst.mockResolvedValue({ id: 'role-staff' });
			prisma.user.create.mockRejectedValue(
				new Prisma.PrismaClientKnownRequestError('dup', {
					code: 'P2002',
					clientVersion: '7',
					meta: { target: ['tenantId', 'username'] },
				}),
			);

			await expect(
				service.create(
					TENANT_ID,
					{
						fullName: 'A',
						username: 'u',
						roleCode: 'STAFF',
						generatePassword: true,
					} as never,
					ctx,
				),
			).rejects.toMatchObject({ response: { reason: 'USERNAME_TAKEN' } });
		});

		it('maps adapter-pg nested P2002 to USERNAME_TAKEN', async () => {
			mockTenantExists();
			mockSeat(0, 10);
			prisma.role.findFirst.mockResolvedValue({ id: 'role-staff' });
			prisma.user.create.mockRejectedValue(
				new Prisma.PrismaClientKnownRequestError('dup', {
					code: 'P2002',
					clientVersion: '7',
					meta: {
						driverAdapterError: {
							cause: {
								constraint: { fields: ['tenantId', 'username'] },
								originalMessage: 'User_tenantId_username_key',
							},
						},
					},
				}),
			);

			await expect(
				service.create(
					TENANT_ID,
					{
						fullName: 'A',
						username: 'u',
						roleCode: 'STAFF',
						generatePassword: true,
					} as never,
					ctx,
				),
			).rejects.toMatchObject({ response: { reason: 'USERNAME_TAKEN' } });
		});
	});

	describe('update', () => {
		it('rejects empty payload with NO_FIELDS', async () => {
			prisma.user.findFirst.mockResolvedValue(userRow());
			await expect(
				service.update(TENANT_ID, USER_ID, {} as never, ctx),
			).rejects.toMatchObject({ response: { reason: 'NO_FIELDS' } });
		});

		it('404 for cross-tenant user', async () => {
			prisma.user.findFirst.mockResolvedValue(null);
			await expect(
				service.update(TENANT_ID, USER_ID, { fullName: 'X' } as never, ctx),
			).rejects.toBeInstanceOf(NotFoundException);
		});
	});

	describe('changeRole', () => {
		it('blocks demoting the last active OWNER with 409 LAST_OWNER', async () => {
			prisma.user.findFirst.mockResolvedValue(
				userRow({ role: { code: 'OWNER' } }),
			);
			prisma.user.count.mockResolvedValue(0); // no other active owners

			await expect(
				service.changeRole(
					TENANT_ID,
					USER_ID,
					{ roleCode: 'STAFF' } as never,
					ctx,
				),
			).rejects.toMatchObject({ response: { reason: 'LAST_OWNER' } });
		});

		it('allows demotion when another active OWNER exists', async () => {
			prisma.user.findFirst.mockResolvedValue(
				userRow({ role: { code: 'OWNER' } }),
			);
			prisma.user.count.mockResolvedValue(1);
			prisma.role.findFirst.mockResolvedValue({ id: 'role-staff' });
			prisma.user.update.mockResolvedValue(
				userRow({ role: { code: 'STAFF' } }),
			);

			const result = await service.changeRole(
				TENANT_ID,
				USER_ID,
				{ roleCode: 'STAFF' } as never,
				ctx,
			);
			expect(result.roleCode).toBe('STAFF');
		});
	});

	describe('deactivate', () => {
		it('blocks deactivating the last active OWNER', async () => {
			prisma.user.findFirst.mockResolvedValue(
				userRow({ role: { code: 'OWNER' } }),
			);
			prisma.user.count.mockResolvedValue(0);

			await expect(
				service.deactivate(TENANT_ID, USER_ID, ctx),
			).rejects.toMatchObject({ response: { reason: 'LAST_OWNER' } });
		});

		it('is idempotent on an already DISABLED user', async () => {
			prisma.user.findFirst.mockResolvedValue(
				userRow({ status: 'DISABLED', role: { code: 'STAFF' } }),
			);
			const result = await service.deactivate(TENANT_ID, USER_ID, ctx);
			expect(result.status).toBe('DISABLED');
			expect(prisma.user.update).not.toHaveBeenCalled();
		});
	});

	describe('reactivate', () => {
		it('409 SEAT_LIMIT_REACHED when no seat available', async () => {
			prisma.user.findFirst.mockResolvedValue(userRow({ status: 'DISABLED' }));
			mockSeat(10, 10);

			await expect(
				service.reactivate(TENANT_ID, USER_ID, ctx),
			).rejects.toMatchObject({ response: { reason: 'SEAT_LIMIT_REACHED' } });
		});

		it('reactivates when a seat is free', async () => {
			prisma.user.findFirst.mockResolvedValue(userRow({ status: 'DISABLED' }));
			mockSeat(1, 10);
			prisma.user.update.mockResolvedValue(userRow({ status: 'ACTIVE' }));

			const result = await service.reactivate(TENANT_ID, USER_ID, ctx);
			expect(result.status).toBe('ACTIVE');
		});
	});

	describe('resetPassword', () => {
		it('forces mustChangePassword=true and returns generated password', async () => {
			prisma.user.findFirst.mockResolvedValue(userRow());
			prisma.user.update.mockResolvedValue({ id: USER_ID });

			const result = await service.resetPassword(
				TENANT_ID,
				USER_ID,
				{ generatePassword: true } as never,
				ctx,
			);

			expect(prisma.user.update).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({ mustChangePassword: true }),
				}),
			);
			expect(result.generatedPassword).toBe('Generated-Pass-123');
		});
	});
});
