import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuditAction, AuditActorType } from '@prisma/client';
import type { Request } from 'express';
import {
	AuditLogger,
	boundedAuditSummary,
} from '../../audit/audit-logger.service';
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
		private readonly audit: AuditLogger,
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
		const missing = required.filter((code) => !granted.has(code));
		if (missing.length > 0) {
			await this.recordDenial(identity, context, required, missing);
			throw new ForbiddenException('Tenant permission denied');
		}
		return true;
	}

	private async recordDenial(
		identity: TenantIdentity,
		context: ExecutionContext,
		required: string[],
		missing: string[],
	): Promise<void> {
		try {
			await this.audit.log({
				tenantId: identity.tenantId,
				actorId: identity.id,
				actorType: AuditActorType.USER,
				actorRoleCode: identity.roleCode ?? null,
				action: AuditAction.PERMISSION_DENIED,
				resource: 'tenant_permission:' + this.resourceLabel(context),
				after: {
					required: boundedAuditSummary(required),
					missing: boundedAuditSummary(missing),
					outcome: 'denied',
				},
			});
		} catch {
			// Authorization semantics must not depend on audit storage.
		}
	}

	private resourceLabel(context: ExecutionContext): string {
		const handler = context.getHandler();
		const controller = context.getClass();
		const handlerName =
			typeof handler === 'function' && handler.name ? handler.name : 'handler';
		const controllerName =
			typeof controller === 'function' && controller.name
				? controller.name
				: 'controller';
		return controllerName + '.' + handlerName;
	}
}
