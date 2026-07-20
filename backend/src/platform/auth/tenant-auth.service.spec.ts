import { TenantAuthService } from './tenant-auth.service';

describe('TenantAuthService registration', () => {
	const dto = {
		tenantName: 'Cửa hàng Xanh',
		slug: 'cua-hang-xanh',
		fullName: 'Chủ cửa hàng',
		username: 'owner',
		email: 'owner@example.com',
		phone: '0900000000',
		password: 'Strong-password1!',
	};

	const created = {
		tenant: {
			id: 'tenant-1',
			slug: 'cua-hang-xanh',
			name: 'Cửa hàng Xanh',
			tenantType: 'HOUSEHOLD',
			mode: 'SIMPLE',
			status: 'ACTIVE',
			logoUrl: null,
			createdAt: '2026-07-20T00:00:00.000Z',
			updatedAt: '2026-07-20T00:00:00.000Z',
			seatBonus: 10,
		},
		owner: {
			id: 'user-1',
			tenantId: 'tenant-1',
			fullName: 'Chủ cửa hàng',
			username: 'owner',
			phone: '0900000000',
			email: 'owner@example.com',
			roleCode: 'OWNER',
			status: 'ACTIVE',
			mustChangePassword: false,
			createdAt: '2026-07-20T00:00:00.000Z',
		},
		generatedPassword: null,
	};

	function setup() {
		const tokens = {
			signTenantRefresh: jest.fn().mockReturnValue('refresh-token'),
			verifyTenantRefresh: jest
				.fn()
				.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 1800 }),
			signTenantAccess: jest.fn().mockReturnValue('access-token'),
		};
		const passwords = { verify: jest.fn().mockResolvedValue(true) };
		const sessions = {
			openUser: jest.fn().mockResolvedValue(undefined),
			revokeUserFamily: jest.fn().mockResolvedValue(undefined),
		};
		const tenants = { createPublic: jest.fn().mockResolvedValue(created) };
		const audit = { run: jest.fn().mockResolvedValue(undefined) };
		const prisma = {
			user: {
				findMany: jest.fn().mockResolvedValue([
					{
						id: 'user-1',
						tenantId: 'tenant-1',
						username: 'owner',
						email: 'owner@example.com',
						phone: '0900000000',
						passwordHash: 'hash',
						fullName: 'Chủ cửa hàng',
						mustChangePassword: false,
						tenant: { slug: 'cua-hang-xanh', name: 'Cửa hàng Xanh' },
						role: {
							code: 'OWNER',
							permissions: [{ permission: { code: 'product:view' } }],
						},
					},
				]),
				findUniqueOrThrow: jest.fn().mockResolvedValue({
					id: 'user-1',
					tenantId: 'tenant-1',
					username: 'owner',
					email: 'owner@example.com',
					phone: '0900000000',
					fullName: 'Chủ cửa hàng',
					mustChangePassword: false,
					tenant: { slug: 'cua-hang-xanh', name: 'Cửa hàng Xanh' },
					role: {
						code: 'OWNER',
						permissions: [{ permission: { code: 'product:view' } }],
					},
				}),
			},
		};
		const service = new TenantAuthService(
			prisma as never,
			passwords as never,
			tokens as never,
			sessions as never,
			audit as never,
			tenants as never,
		);
		return { service, tokens, sessions, tenants, prisma, audit, passwords };
	}

	it('creates a real authenticated response without credential fields', async () => {
		const { service, sessions, tenants } = setup();
		const result = await service.register(dto);

		expect(tenants.createPublic).toHaveBeenCalledWith(dto);
		expect(sessions.openUser).toHaveBeenCalledTimes(2);
		expect(result).toEqual(
			expect.objectContaining({
				accessToken: 'access-token',
				refreshToken: 'refresh-token',
				user: expect.objectContaining({
					id: 'user-1',
					role: 'OWNER',
					permissions: ['product:view'],
				}),
			}),
		);
		expect(result).not.toHaveProperty('passwordHash');
		expect(result).not.toHaveProperty('user.password');
	});

	it('revokes the pre-opened session when provisioning fails', async () => {
		const { service, sessions, tenants } = setup();
		tenants.createPublic.mockRejectedValueOnce(new Error('conflict'));

		await expect(service.register(dto)).rejects.toThrow('conflict');
		expect(sessions.revokeUserFamily).toHaveBeenCalledTimes(1);
	});

	it('resolves a unique identifier and returns current permissions', async () => {
		const { service, audit, sessions, prisma } = setup();
		const result = await service.login(' owner ', 'Strong-password1!', {
			ip: '127.0.0.1',
			userAgent: 'test-agent',
		});

		expect(prisma.user.findMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({
					tenant: { status: 'ACTIVE', deletedAt: null },
					OR: [{ username: 'owner' }, { email: 'owner' }, { phone: 'owner' }],
				}),
			}),
		);
		expect(sessions.openUser).toHaveBeenCalledWith(
			expect.any(String),
			expect.any(String),
			expect.any(Number),
			'user-1',
		);
		expect(audit.run).toHaveBeenCalledWith(
			expect.objectContaining({
				tenantId: 'tenant-1',
				actorId: 'user-1',
				actorRoleCode: 'OWNER',
				action: 'LOGIN',
			}),
			expect.any(Function),
		);
		expect(result.user.permissions).toEqual(['product:view']);
	});

	it('performs decoy verification and returns one generic failure for missing users', async () => {
		const { service, prisma, passwords } = setup();
		prisma.user.findMany.mockResolvedValueOnce([]);
		passwords.verify.mockResolvedValueOnce(false);

		await expect(service.login('owner', 'bad-password')).rejects.toThrow(
			'Invalid credentials',
		);
		expect(passwords.verify).toHaveBeenCalledWith(
			expect.any(String),
			'bad-password',
		);
	});
});
