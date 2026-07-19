import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AccessClaims, TenantIdentity } from '../token.service';

@Injectable()
export class TenantAccessTokenStrategy extends PassportStrategy(
	Strategy,
	'tenant-jwt',
) {
	constructor() {
		const secret = process.env.JWT_ACCESS_SECRET;
		if (!secret) throw new Error('JWT_ACCESS_SECRET must be set');
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKey: secret,
			ignoreExpiration: false,
			algorithms: ['HS256'],
		});
	}

	validate(payload: AccessClaims): TenantIdentity {
		if (
			payload.type !== 'access' ||
			payload.userType !== 'tenant' ||
			!payload.tenantId
		) {
			throw new UnauthorizedException('Wrong tenant token type');
		}
		return {
			id: payload.sub,
			tenantId: payload.tenantId,
			username: payload.email,
			roleCode: payload.role,
		};
	}
}
