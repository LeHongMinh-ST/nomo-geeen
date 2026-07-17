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

	const admin = { id: 'a1', email: 'admin@nomogreen.vn', role: 'SUPER_ADMIN' };

	it('signAccess embeds sub/email/role/type/familyId and verifies with access secret', () => {
		const token = service.signAccess(admin, 'fam-1');
		const claims = service.verifyAccess(token);
		expect(claims.sub).toBe('a1');
		expect(claims.email).toBe('admin@nomogreen.vn');
		expect(claims.role).toBe('SUPER_ADMIN');
		expect(claims.type).toBe('access');
		expect(claims.familyId).toBe('fam-1');
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
});
