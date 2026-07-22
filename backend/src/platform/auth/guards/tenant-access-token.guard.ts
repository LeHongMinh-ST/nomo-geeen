import type { ExecutionContext } from '@nestjs/common';
import {
	ForbiddenException,
	Injectable,
	ServiceUnavailableException,
	UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { RefreshTokenStore } from '../refresh-token.store';

@Injectable()
export class TenantAccessTokenGuard extends AuthGuard('tenant-jwt') {
	private readonly extract = ExtractJwt.fromAuthHeaderAsBearerToken();

	constructor(
		private readonly store: RefreshTokenStore,
		private readonly prisma: PrismaService,
	) {
		super();
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<Request>();
		const token = this.extract(request);
		if (!token) throw new UnauthorizedException('Missing access token');
		try {
			if (await this.store.isUserAccessBlacklisted(token)) {
				throw new UnauthorizedException('Token revoked');
			}
		} catch (error) {
			if (error instanceof UnauthorizedException) throw error;
			throw new ServiceUnavailableException('Auth store unavailable');
		}
		const activated = (await super.canActivate(context)) as boolean;
		if (!activated) return false;
		const user = request.user as { id?: string; tenantId?: string } | undefined;
		if (!user?.id || !user.tenantId) {
			throw new UnauthorizedException('Invalid tenant identity');
		}
		const current = await this.prisma.user.findFirst({
			where: {
				id: user.id,
				tenantId: user.tenantId,
				status: 'ACTIVE',
				deletedAt: null,
				tenant: { status: 'ACTIVE', deletedAt: null },
			},
			select: { id: true, mustChangePassword: true },
		});
		if (!current) throw new UnauthorizedException('User not found');
		if (current.mustChangePassword) {
			throw new ForbiddenException('Password change required');
		}
		return true;
	}
}
