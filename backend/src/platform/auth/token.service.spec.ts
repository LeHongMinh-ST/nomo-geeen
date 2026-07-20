import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';

describe('TokenService', () => {
	const ACCESS = 'test-access-secret';
	const REFRESH = 'test-refresh-secret';
	let service: TokenService;

	beforeAll(() => {
		process.env.JWT_ACCESS_SECRET = ACCESS;
		process.env.JWT_REFRESH_SECRET = REFRESH;
		process.env.JWT_ACCESS_TTL = '15m';
		process.env.JWT_REFRESH_TTL = '30d';
		service = new TokenService(new JwtService());
	});

	const admin = {
		id: 'a1',
		email: 'admin@nomogreen.vn',
		role: 'SUPER_ADMIN',
		roleCodes: ['SUPER_ADMIN'],
		permissions: ['admin.user:view', 'admin.role:create'],
	};

	it('signAccess embeds sub/email/role/type/familyId and verifies with access secret', () => {
		const token = service.signAccess(admin, 'fam-1');
		const claims = service.verifyAccess(token);
		expect(claims.sub).toBe('a1');
		expect(claims.email).toBe('admin@nomogreen.vn');
		expect(claims.role).toBe('SUPER_ADMIN');
		expect(claims.type).toBe('access');
		expect(claims.familyId).toBe('fam-1');
	});

	it('signAccess joins multi-role roleCodes into CSV `role` field (F-06)', () => {
		const multiRole = {
			...admin,
			roleCodes: ['SUPER_ADMIN', 'BILLING'],
		};
		const token = service.signAccess(multiRole, 'fam-2');
		const claims = service.verifyAccess(token);
		expect(claims.role).toBe('SUPER_ADMIN,BILLING');
		expect(claims.roleCodes).toEqual(['SUPER_ADMIN', 'BILLING']);
		expect(claims.permissions).toEqual([
			'admin.user:view',
			'admin.role:create',
		]);
	});

	it('verifyAccess derives roleCodes from CSV when roleCodes field absent (backward compat)', () => {
		const jwt = new JwtService();
		const legacy = jwt.sign(
			{
				sub: 'a1',
				email: 'admin@nomogreen.vn',
				role: 'SUPPORT,BILLING',
				type: 'access',
				familyId: 'fam-legacy',
			},
			{ secret: ACCESS, expiresIn: '15m' },
		);
		const claims = service.verifyAccess(legacy);
		expect(claims.roleCodes).toEqual(['SUPPORT', 'BILLING']);
		expect(claims.permissions).toEqual([]);
	});

	it('verifyAccess rejects a refresh token (wrong type/secret)', () => {
		const refresh = service.signRefresh('a1', 'fam-1');
		expect(() => service.verifyAccess(refresh)).toThrow(UnauthorizedException);
	});

	it('verifyRefresh rejects an access token', () => {
		const access = service.signAccess(admin, 'fam-1');
		expect(() => service.verifyRefresh(access)).toThrow(UnauthorizedException);
	});

	it('verifyRefresh returns sub/familyId/type for a refresh token', () => {
		const refresh = service.signRefresh('a1', 'fam-9');
		const claims = service.verifyRefresh(refresh);
		expect(claims.sub).toBe('a1');
		expect(claims.familyId).toBe('fam-9');
		expect(claims.type).toBe('refresh');
	});

	it('verifyAccess throws on a token signed with the wrong secret', () => {
		const jwt = new JwtService();
		const forged = jwt.sign(
			{ sub: 'a1', type: 'access' },
			{ secret: 'attacker-secret', expiresIn: '15m' },
		);
		expect(() => service.verifyAccess(forged)).toThrow(UnauthorizedException);
	});

	it('verifyAccess throws on an expired token', () => {
		const jwt = new JwtService();
		const expired = jwt.sign(
			{ sub: 'a1', email: 'x', role: 'y', type: 'access', familyId: 'f' },
			{ secret: ACCESS, expiresIn: '-1s' },
		);
		expect(() => service.verifyAccess(expired)).toThrow(UnauthorizedException);
	});

	it('decodeExpiredAccess accepts an expired but signature-valid access token', () => {
		const jwt = new JwtService();
		const expired = jwt.sign(
			{ sub: 'a1', email: 'x', role: 'y', type: 'access', familyId: 'f9' },
			{ secret: ACCESS, expiresIn: '-1s' },
		);
		const claims = service.decodeExpiredAccess(expired);
		expect(claims.sub).toBe('a1');
		expect(claims.familyId).toBe('f9');
	});

	it('signs and verifies tenant access claims without changing admin claims', () => {
		const token = service.signTenantAccess(
			{
				id: 'u1',
				tenantId: 't1',
				username: 'owner',
				roleCode: 'OWNER',
				permissions: ['product:view'],
			},
			'family-user-1',
		);
		const claims = service.verifyTenantAccess(token);
		expect(claims).toEqual(
			expect.objectContaining({
				sub: 'u1',
				tenantId: 't1',
				username: 'owner',
				role: 'OWNER',
				permissions: ['product:view'],
				familyId: 'family-user-1',
				userType: 'tenant',
				type: 'access',
			}),
		);
	});

	it('signs a tenant refresh claim with a separate realm marker', () => {
		const token = service.signTenantRefresh('u1', 't1', 'family-user-2');
		const claims = service.verifyTenantRefresh(token);
		expect(claims).toEqual(
			expect.objectContaining({
				sub: 'u1',
				tenantId: 't1',
				familyId: 'family-user-2',
				userType: 'tenant',
				type: 'refresh',
			}),
		);
	});

	it('rejects an admin token at the tenant verification boundary', () => {
		const token = service.signAccess(admin, 'admin-family');
		expect(() => service.verifyTenantAccess(token)).toThrow(
			UnauthorizedException,
		);
	});
});
