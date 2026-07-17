import {
	type ExecutionContext,
	Injectable,
	ServiceUnavailableException,
	UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';
import { RefreshTokenStore } from '../refresh-token.store';

/**
 * Guard access token: (1) check blacklist Redis truoc (401 neu bi thu hoi),
 * fail closed 503 neu Redis loi; (2) sau do passport-jwt xac minh chu ky/exp.
 */
@Injectable()
export class AccessTokenGuard extends AuthGuard('jwt') {
	private readonly extract = ExtractJwt.fromAuthHeaderAsBearerToken();

	constructor(private readonly store: RefreshTokenStore) {
		super();
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<Request>();
		const token = this.extract(request);
		if (!token) {
			throw new UnauthorizedException('Missing access token');
		}

		let blacklisted: boolean;
		try {
			blacklisted = await this.store.isAccessBlacklisted(token);
		} catch {
			// Redis khong xac minh duoc trang thai thu hoi -> fail closed.
			throw new ServiceUnavailableException('Auth store unavailable');
		}
		if (blacklisted) {
			throw new UnauthorizedException('Token revoked');
		}

		return (await super.canActivate(context)) as boolean;
	}
}
