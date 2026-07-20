import { ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class AuthRequestPolicy {
	assertAllowedCookieOrigin(request: Request): void {
		const configured = process.env.CORS_ORIGIN?.trim();
		if (!configured) return;

		const originHeader = request.get('origin');
		const referer = request.get('referer');
		const origin =
			originHeader ?? (referer ? this.originFromReferer(referer) : undefined);
		if (!origin || !this.isAllowedOrigin(origin, configured)) {
			throw new ForbiddenException('Invalid request origin');
		}
	}

	assertSingleRefreshRealm(
		cookies: Record<string, string> | undefined,
	): string {
		const admin = cookies?.nomo_admin_rt;
		const user = cookies?.nomo_user_rt;
		if ((admin ? 1 : 0) + (user ? 1 : 0) !== 1) {
			throw new ForbiddenException('Ambiguous refresh session realm');
		}
		return admin ? 'admin' : 'tenant';
	}

	private isAllowedOrigin(origin: string, configured: string): boolean {
		return configured
			.split(',')
			.map((value) => value.trim().replace(/\/$/, ''))
			.filter(Boolean)
			.includes(origin.trim().replace(/\/$/, ''));
	}

	private originFromReferer(referer: string): string | undefined {
		try {
			return new URL(referer).origin;
		} catch {
			return undefined;
		}
	}
}
