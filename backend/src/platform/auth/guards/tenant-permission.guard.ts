import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { TENANT_PERMISSIONS_KEY } from '../decorators/require-tenant-permission.decorator';
import type { TenantIdentity } from '../token.service';

interface TenantRequest extends Request {
	user?: TenantIdentity;
}

@Injectable()
export class TenantPermissionGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly prisma: PrismaService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<TenantRequest>();
		const identity = request.user;
		if (!identity?.id || !identity.tenantId) {
			throw new UnauthorizedException('No authenticated tenant context');
		}
		const required = this.reflector.getAllAndOverride<string[]>(
			TENANT_PERMISSIONS_KEY,
			[context.getHandler(), context.getClass()],
		);
		if (!required || required.length === 0) return true;

		const user = await this.prisma.user.findFirst({
			where: {
				id: identity.id,
				tenantId: identity.tenantId,
				status: 'ACTIVE',
				deletedAt: null,
				tenant: { status: 'ACTIVE', deletedAt: null },
			},
			select: {
				role: {
					select: {
						permissions: {
							select: { permission: { select: { code: true } } },
						},
					},
				},
			},
		});
		if (!user) throw new UnauthorizedException('User not found');
		const granted = new Set(
			user.role.permissions.map((grant) => grant.permission.code),
		);
		if (required.some((code) => !granted.has(code))) {
			throw new ForbiddenException('Tenant permission denied');
		}
		return true;
	}
}
