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
import { isAdminPermissionCode } from '../../roles/role-permission-scope';
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

		// Tenant guard only evaluates tenant permission namespace.
		// Fail-closed if route metadata accidentally requires admin.* codes.
		const adminRequired = required.filter(isAdminPermissionCode);
		if (adminRequired.length > 0) {
			await this.recordDenial(
				identity,
				context,
				required,
				adminRequired,
				'ADMIN_METADATA_REQUIRED',
			);
			throw new ForbiddenException('Tenant permission denied');
		}

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
						// Bound role to authenticated tenant + non-admin.
						tenantId: true,
						isAdmin: true,
						permissions: {
							select: { permission: { select: { code: true } } },
						},
					},
				},
			},
		});
		if (!user) throw new UnauthorizedException('User not found');

		// Role must belong to the authenticated tenant and never be an admin role.
		if (
			user.role.tenantId !== identity.tenantId ||
			user.role.isAdmin === true
		) {
			await this.recordDenial(
				identity,
				context,
				required,
				required,
				'ROLE_SCOPE_MISMATCH',
			);
			throw new ForbiddenException('Tenant permission denied');
		}

		const grantedCodes = user.role.permissions.map(
			(grant) => grant.permission.code,
		);
		// Fail-closed if a tenant role somehow carries admin.* grants.
		const leakedAdmin = grantedCodes.filter(isAdminPermissionCode);
		if (leakedAdmin.length > 0) {
			await this.recordDenial(
				identity,
				context,
				required,
				leakedAdmin,
				'LEAKED_ADMIN_GRANT',
			);
			throw new ForbiddenException('Tenant permission denied');
		}

		const granted = new Set(grantedCodes);
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
		reason?: string,
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
					// Bounded stable code for scope denials; omitted for plain missing grants.
					...(reason ? { reason: reason.slice(0, 64) } : {}),
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
