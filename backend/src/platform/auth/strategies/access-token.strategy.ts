import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AccessClaims, AdminIdentity } from '../token.service';

/**
 * Passport JWT strategy cho access token. Xac minh chu ky + exp bang JWT_ACCESS_SECRET.
 * Blacklist check nam o AccessTokenGuard (can Redis).
 */
@Injectable()
export class AccessTokenStrategy extends PassportStrategy(Strategy, 'jwt') {
	constructor() {
		const secret = process.env.JWT_ACCESS_SECRET;
		if (!secret) {
			throw new Error('JWT_ACCESS_SECRET must be set');
		}
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			secretOrKey: secret,
			ignoreExpiration: false,
			algorithms: ['HS256'],
		});
	}

	validate(payload: AccessClaims): AdminIdentity {
		if (payload.type !== 'access') {
			throw new UnauthorizedException('Wrong token type');
		}
		return {
			id: payload.sub,
			email: payload.email,
			role: payload.role,
		};
	}
}
