import {
	CanActivate,
	ExecutionContext,
	ForbiddenException,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { SUPER_ADMIN_ROLE_CODE } from '../../admin-users/admin.constants';
import { PERMISSIONS_KEY } from '../decorators/require-permission.decorator';
import type { AdminIdentity } from '../token.service';

interface AuthedRequest extends Request {
	user?: AdminIdentity;
}

/**
 * PermissionGuard (R4.1-R4.4): doc metadata 'permissions' tu RequirePermission,
 * so sanh voi req.user.permissions. SUPER_ADMIN shortcut (R4.2) bypass check.
 *
 * AND semantics (R4.3): tat ca codes trong metadata phai co trong permissions[].
 * No-metadata route -> allow (R0-03 step 1 rule).
 */
@Injectable()
export class PermissionGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	canActivate(ctx: ExecutionContext): boolean {
		const required = this.reflector.getAllAndOverride<string[] | undefined>(
			PERMISSIONS_KEY,
			[ctx.getHandler(), ctx.getClass()],
		);
		if (!required || required.length === 0) {
			return true;
		}

		const req = ctx.switchToHttp().getRequest<AuthedRequest>();
		const user = req.user;
		if (!user) {
			// R4.4: no JWT identity -> 401. AccessTokenGuard usually catches this first,
			// but PermissionGuard should fail-closed if composed without AccessTokenGuard.
			throw new UnauthorizedException('No admin identity');
		}

		// R4.2: SUPER_ADMIN shortcut bypass.
		if (user.roleCodes?.includes(SUPER_ADMIN_ROLE_CODE)) {
			return true;
		}

		// R4.3: AND semantics.
		const userPerms = user.permissions ?? [];
		const missing = required.filter((code) => !userPerms.includes(code));
		if (missing.length > 0) {
			throw new ForbiddenException({
				reason: 'PERMISSION_DENIED',
				missing,
			});
		}
		return true;
	}
}