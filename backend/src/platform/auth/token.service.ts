import { randomUUID } from 'node:crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';

export interface AdminIdentity {
	id: string;
	email: string;
	role: string; // BACKWARD-COMPAT: comma-joined roleCodes (R5.1, F-06)
	roleCodes: string[]; // NEW: replaces single `role: string` (Phase B cutover)
	permissions: string[]; // NEW: flat permission codes for guard + FE gating
}

export interface AccessClaims {
	sub: string;
	email: string;
	role: string; // BACKWARD-COMPAT: CSV-joined roleCodes (F-06)
	roleCodes?: string[]; // NEW: optional for OLD-shape tokens
	permissions?: string[]; // NEW: optional for OLD-shape tokens
	type: 'access';
	familyId: string;
	jti?: string;
	iat?: number;
	exp?: number;
}

export interface RefreshClaims {
	sub: string;
	familyId: string;
	type: 'refresh';
	jti?: string;
	iat?: number;
	exp?: number;
}

/**
 * Ky/xac minh JWT access (~15m) va refresh (~30d) voi 2 secret RIENG (R8.1).
 * familyId nam trong access claim de logout thu hoi family tu bearer token (R4.1).
 */
@Injectable()
export class TokenService {
	private readonly accessSecret: string;
	private readonly refreshSecret: string;
	private readonly accessTtl: string;
	private readonly refreshTtl: string;

	constructor(private readonly jwt: JwtService) {
		this.accessSecret = process.env.JWT_ACCESS_SECRET ?? '';
		this.refreshSecret = process.env.JWT_REFRESH_SECRET ?? '';
		this.accessTtl = process.env.JWT_ACCESS_TTL ?? '15m';
		this.refreshTtl = process.env.JWT_REFRESH_TTL ?? '30d';
		if (!this.accessSecret || !this.refreshSecret) {
			throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be set');
		}
	}

	signAccess(admin: AdminIdentity, familyId: string): string {
		// F-06 sign contract: `role` field stays as CSV-joined roleCodes so
		// legacy consumers reading `payload.role` keep working unchanged.
		const roleCsv = admin.roleCodes.join(',');
		const payload = {
			sub: admin.id,
			email: admin.email,
			role: roleCsv,
			roleCodes: admin.roleCodes,
			permissions: admin.permissions,
			type: 'access',
			familyId,
			jti: randomUUID(),
		};
		return this.jwt.sign(payload, {
			secret: this.accessSecret,
			expiresIn: this.accessTtl,
		} as JwtSignOptions);
	}

	signRefresh(adminId: string, familyId: string): string {
		const payload = {
			sub: adminId,
			familyId,
			type: 'refresh',
			jti: randomUUID(),
		};
		return this.jwt.sign(payload, {
			secret: this.refreshSecret,
			expiresIn: this.refreshTtl,
		} as JwtSignOptions);
	}

	verifyAccess(token: string): AccessClaims {
		let claims: AccessClaims;
		try {
			claims = this.jwt.verify<AccessClaims>(token, {
				secret: this.accessSecret,
				algorithms: ['HS256'],
			});
		} catch {
			throw new UnauthorizedException('Invalid access token');
		}
		if (claims.type !== 'access') {
			throw new UnauthorizedException('Wrong token type');
		}
		// F-06 backward read: OLD-shape tokens lack `roleCodes`; derive from CSV `role`.
		if (!claims.roleCodes || claims.roleCodes.length === 0) {
			claims.roleCodes =
				claims.role && claims.role.length > 0
					? claims.role.split(',').map((s) => s.trim()).filter(Boolean)
					: [];
		}
		if (!claims.permissions) {
			claims.permissions = [];
		}
		return claims;
	}

	verifyRefresh(token: string): RefreshClaims {
		let claims: RefreshClaims;
		try {
			claims = this.jwt.verify<RefreshClaims>(token, {
				secret: this.refreshSecret,
				algorithms: ['HS256'],
			});
		} catch {
			throw new UnauthorizedException('Invalid refresh token');
		}
		if (claims.type !== 'refresh') {
			throw new UnauthorizedException('Wrong token type');
		}
		return claims;
	}

	/**
	 * Giai ma access token da het han nhung con hop le chu ky (cho logout phien idle).
	 * Bo qua kiem tra exp; van xac minh chu ky + type.
	 */
	decodeExpiredAccess(token: string): AccessClaims {
		let claims: AccessClaims;
		try {
			claims = this.jwt.verify<AccessClaims>(token, {
				secret: this.accessSecret,
				algorithms: ['HS256'],
				ignoreExpiration: true,
			});
		} catch {
			throw new UnauthorizedException('Invalid access token');
		}
		if (claims.type !== 'access') {
			throw new UnauthorizedException('Wrong token type');
		}
		// Same backward-fill as verifyAccess (F-06).
		if (!claims.roleCodes || claims.roleCodes.length === 0) {
			claims.roleCodes =
				claims.role && claims.role.length > 0
					? claims.role.split(',').map((s) => s.trim()).filter(Boolean)
					: [];
		}
		if (!claims.permissions) {
			claims.permissions = [];
		}
		return claims;
	}
}
