import type { ExecutionContext } from '@nestjs/common';
import {
	Injectable,
	ServiceUnavailableException,
	UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';
import { RefreshTokenStore } from '../refresh-token.store';

@Injectable()
export class TenantAccessTokenGuard extends AuthGuard('tenant-jwt') {
	private readonly extract = ExtractJwt.fromAuthHeaderAsBearerToken();

	constructor(private readonly store: RefreshTokenStore) {
		super();
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<Request>();
		const token = this.extract(request);
		if (!token) throw new UnauthorizedException('Missing access token');
		try {
			if (await this.store.isAccessBlacklisted(token)) {
				throw new UnauthorizedException('Token revoked');
			}
		} catch (error) {
			if (error instanceof UnauthorizedException) throw error;
			throw new ServiceUnavailableException('Auth store unavailable');
		}
		return (await super.canActivate(context)) as boolean;
	}
}
