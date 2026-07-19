import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import {
	ENTITLEMENT_FEATURE_KEY,
	ENTITLEMENT_QUOTA_KEY,
	type RequiredQuota,
} from './entitlement.constants';
import { EntitlementService } from './entitlement.service';

interface TenantRequest extends Request {
	user?: { tenantId?: string };
	tenantContext?: { tenantId?: string };
	entitlementUsage?: Record<string, number | bigint>;
}

@Injectable()
export class EntitlementsGuard implements CanActivate {
	constructor(
		private readonly reflector: Reflector,
		private readonly entitlements: EntitlementService,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<TenantRequest>();
		const authenticatedTenantId = request.user?.tenantId;
		const tenantId = authenticatedTenantId;
		if (!tenantId)
			throw new UnauthorizedException('No authenticated tenant context');

		const suppliedTenantIds = [
			request.params?.tenantId,
			(request.body as { tenantId?: string } | undefined)?.tenantId,
		].filter((value): value is string => Boolean(value));
		if (
			authenticatedTenantId &&
			suppliedTenantIds.some((value) => value !== authenticatedTenantId)
		) {
			throw new UnauthorizedException('Tenant context mismatch');
		}

		const featureCode = this.reflector.getAllAndOverride<string | undefined>(
			ENTITLEMENT_FEATURE_KEY,
			[context.getHandler(), context.getClass()],
		);
		if (featureCode)
			await this.entitlements.assertFeature(tenantId, featureCode);

		const quota = this.reflector.getAllAndOverride<RequiredQuota | undefined>(
			ENTITLEMENT_QUOTA_KEY,
			[context.getHandler(), context.getClass()],
		);
		if (quota) {
			const current =
				request.entitlementUsage?.[quota.dimension] ??
				(await this.entitlements.getQuotaUsage(tenantId, quota.dimension));
			await this.entitlements.assertQuota(
				tenantId,
				quota.dimension,
				current,
				quota.requested ?? 1,
			);
		}
		return true;
	}
}
