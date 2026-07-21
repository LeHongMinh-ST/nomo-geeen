import {
	Body,
	Controller,
	Get,
	HttpCode,
	Patch,
	Post,
	Query,
	Req,
	Res,
	ServiceUnavailableException,
	UnauthorizedException,
	UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthRequestPolicy } from './auth-request-policy';
import { RequirePermission } from './decorators/require-permission.decorator';
import { AdminLoginDto } from './dto/admin-login.dto';
import { ChangeTenantPasswordDto } from './dto/change-tenant-password.dto';
import { TenantLoginDto } from './dto/tenant-login.dto';
import { TenantRegisterDto } from './dto/tenant-register.dto';
import { UpdateTenantProfileDto } from './dto/update-tenant-profile.dto';
import { AccessTokenGuard } from './guards/access-token.guard';
import { PermissionGuard } from './guards/permission.guard';
import { RefreshTokenStore } from './refresh-token.store';
import { TenantAuthService } from './tenant-auth.service';
import {
	type AccessClaims,
	type AdminIdentity,
	TokenService,
} from './token.service';

const REFRESH_COOKIE = 'nomo_admin_rt';
const USER_REFRESH_COOKIE = 'nomo_user_rt';
type RefreshRealm = 'admin' | 'user';

function requestedRefreshRealm(value: unknown): RefreshRealm | undefined {
	return value === 'admin' || value === 'user' ? value : undefined;
}

function cookieSecure(): boolean {
	return process.env.AUTH_COOKIE_SECURE !== 'false';
}

function refreshCookieOptions(maxAgeMs?: number, userCookie = false) {
	const isDev = process.env.NODE_ENV !== 'production';
	const sameSite: 'none' | 'strict' = userCookie ? 'none' : 'strict';
	// SameSite=None + Secure=true can thiet de browser gui cookie HttpOnly
	// cross-origin qua fetch() tu FE (:3000) den backend (:3001) voi
	// credentials: 'include'. SameSite=Lax chi cho phep top-level navigation,
	// khong gui kem cross-origin fetch POST -> /auth/refresh 401 khi F5.
	// Chrome co exception cho localhost (treated as secure context) nen
	// `secure: true` cung hoat dong o dev khong can HTTPS that su.
	return {
		httpOnly: true,
		secure: isDev ? true : cookieSecure(),
		sameSite,
		path: '/',
		...(maxAgeMs !== undefined ? { maxAge: maxAgeMs } : {}),
	};
}

function bearerToken(req: Request): string {
	const header = req.get('authorization') ?? '';
	const [scheme, token] = header.split(' ');
	if (scheme !== 'Bearer' || !token) {
		throw new UnauthorizedException('Missing access token');
	}
	return token;
}

interface AuthedRequest extends Request {
	user: AdminIdentity;
}

@Controller('auth')
export class AuthController {
	constructor(
		private readonly auth: AuthService,
		private readonly tenantAuth: TenantAuthService,
		private readonly tokens: TokenService,
		private readonly sessions: RefreshTokenStore,
		private readonly requestPolicy: AuthRequestPolicy,
	) {}

	@Post('login')
	@HttpCode(200)
	async loginTenant(
		@Body() dto: TenantLoginDto,
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
	) {
		const result = await this.tenantAuth.login(dto.identifier, dto.password, {
			ip: req.ip,
			userAgent: req.get('user-agent') ?? undefined,
		});
		res.cookie(USER_REFRESH_COOKIE, result.refreshToken, {
			...refreshCookieOptions(result.refreshTtlSec * 1000, true),
			path: '/auth',
		});
		return { accessToken: result.accessToken, user: result.user };
	}

	@Post('register')
	@HttpCode(201)
	async register(
		@Body() dto: TenantRegisterDto,
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
	) {
		const result = await this.tenantAuth.register(dto, {
			ip: req.ip,
			userAgent: req.get('user-agent') ?? undefined,
		});
		res.cookie(USER_REFRESH_COOKIE, result.refreshToken, {
			...refreshCookieOptions(result.refreshTtlSec * 1000, true),
			path: '/auth',
		});
		return { accessToken: result.accessToken, user: result.user };
	}

	@Post('change-password')
	@HttpCode(200)
	async changePassword(
		@Body() dto: ChangeTenantPasswordDto,
		@Req() req: Request,
	) {
		const claims = this.tokens.verifyTenantAccess(bearerToken(req));
		if (!claims.tenantId)
			throw new UnauthorizedException('Invalid tenant token');
		this.requestPolicy.assertAllowedCookieOrigin(req);
		return {
			user: await this.tenantAuth.changePassword(
				claims.sub,
				claims.tenantId,
				claims.familyId,
				dto,
			),
		};
	}

	@Post('admin/login')
	@HttpCode(200)
	async login(
		@Body() dto: AdminLoginDto,
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
	) {
		const result = await this.auth.login(dto.email, dto.password, {
			ip: req.ip,
			userAgent: req.get('user-agent') ?? undefined,
		});

		res.cookie(
			REFRESH_COOKIE,
			result.refreshToken,
			refreshCookieOptions(result.refreshTtlSec * 1000),
		);

		return { accessToken: result.accessToken, admin: result.admin };
	}

	@Post('refresh')
	@HttpCode(200)
	async refresh(
		@Req() req: Request,
		@Res({ passthrough: true }) res: Response,
	) {
		const cookies = req.cookies as Record<string, string> | undefined;
		const userCookie = cookies?.[USER_REFRESH_COOKIE];
		const adminCookie = cookies?.[REFRESH_COOKIE];
		const realm = requestedRefreshRealm(req.query.realm);

		if (realm === 'user') {
			if (!userCookie) throw new UnauthorizedException('Missing user refresh token');
			this.requestPolicy.assertAllowedCookieOrigin(req);
			const result = await this.tenantAuth.refreshUser(userCookie, {
				ip: req.ip,
				userAgent: req.get('user-agent') ?? undefined,
			});
			res.cookie(USER_REFRESH_COOKIE, result.refreshToken, {
				...refreshCookieOptions(result.refreshTtlSec * 1000, true),
				path: '/auth',
			});
			return { accessToken: result.accessToken, user: result.user };
		}

		if (realm === 'admin') {
			if (!adminCookie) throw new UnauthorizedException('Missing admin refresh token');
			try {
				const result = await this.auth.refresh(adminCookie, {
					ip: req.ip,
					userAgent: req.get('user-agent') ?? undefined,
				});
				res.cookie(
					REFRESH_COOKIE,
					result.refreshToken,
					refreshCookieOptions(result.refreshTtlSec * 1000),
				);
				return { accessToken: result.accessToken };
			} catch (err) {
				console.log(
					`[auth/refresh] 401 realm=admin reason=${(err as Error).message ?? 'unknown'}`,
				);
				throw err;
			}
		}

		if (userCookie) {
			this.requestPolicy.assertSingleRefreshRealm(cookies);
			this.requestPolicy.assertAllowedCookieOrigin(req);
			const result = await this.tenantAuth.refreshUser(userCookie, {
				ip: req.ip,
				userAgent: req.get('user-agent') ?? undefined,
			});
			res.cookie(USER_REFRESH_COOKIE, result.refreshToken, {
				...refreshCookieOptions(result.refreshTtlSec * 1000, true),
				path: '/auth',
			});
			return { accessToken: result.accessToken, user: result.user };
		}
		const cookie = adminCookie;
		if (!cookie) {
			console.log('[auth/refresh] 401 reason=missing_cookie');
			throw new UnauthorizedException('Missing refresh token');
		}
		try {
			const result = await this.auth.refresh(cookie, {
				ip: req.ip,
				userAgent: req.get('user-agent') ?? undefined,
			});
			res.cookie(
				REFRESH_COOKIE,
				result.refreshToken,
				refreshCookieOptions(result.refreshTtlSec * 1000),
			);
			return { accessToken: result.accessToken };
		} catch (err) {
			console.log(
				`[auth/refresh] 401 reason=${(err as Error).message ?? 'unknown'}`,
			);
			throw err;
		}
	}

	@Post('logout')
	@HttpCode(204)
	async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
		const token = bearerToken(req);
		let claims: AccessClaims;
		try {
			claims = this.tokens.verifyAccess(token);
		} catch {
			claims = this.tokens.decodeExpiredAccess(token);
		}
		if (claims.userType === 'tenant') {
			this.requestPolicy.assertAllowedCookieOrigin(req);
			if (!claims.tenantId)
				throw new UnauthorizedException('Invalid tenant token');
			await this.tenantAuth.logoutUser(token, claims, {
				ip: req.ip,
				userAgent: req.get('user-agent') ?? undefined,
			});
			res.clearCookie(USER_REFRESH_COOKIE, {
				...refreshCookieOptions(undefined, true),
				path: '/auth',
			});
			return;
		}
		await this.auth.logout(token, {
			ip: req.ip,
			userAgent: req.get('user-agent') ?? undefined,
		});
		res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
	}

	@Get('me')
	async me(@Req() req: Request) {
		const token = bearerToken(req);
		const claims = this.tokens.verifyAccess(token);
		try {
			const blacklisted =
				claims.userType === 'tenant'
					? await this.sessions.isUserAccessBlacklisted(token)
					: await this.sessions.isAccessBlacklisted(token);
			if (blacklisted) throw new UnauthorizedException('Token revoked');
		} catch (error) {
			if (error instanceof UnauthorizedException) throw error;
			throw new ServiceUnavailableException('Auth store unavailable');
		}
		if (claims.userType === 'tenant') {
			if (!claims.tenantId)
				throw new UnauthorizedException('Invalid tenant token');
			return this.tenantAuth.meUser(claims.sub, claims.tenantId);
		}
		try {
			const admin = await this.auth.me(claims.sub);
			console.log(
				`[auth/me] 200 adminId=${admin.id} roleCodes=${JSON.stringify(
					admin.roleCodes,
				)} permissions=${admin.permissions.length}`,
			);
			return admin;
		} catch (err) {
			console.log(
				`[auth/me] ERR reason=${(err as Error).message ?? 'unknown'}`,
			);
			throw err;
		}
	}

	@Get('profile')
	async profile(@Req() req: Request) {
		const claims = this.tokens.verifyTenantAccess(bearerToken(req));
		if (!claims.tenantId) throw new UnauthorizedException('Invalid tenant token');
		return this.tenantAuth.profile(claims.sub, claims.tenantId);
	}

	@Patch('profile')
	async updateProfile(
		@Body() dto: UpdateTenantProfileDto,
		@Req() req: Request,
	) {
		const claims = this.tokens.verifyTenantAccess(bearerToken(req));
		if (!claims.tenantId) throw new UnauthorizedException('Invalid tenant token');
		this.requestPolicy.assertAllowedCookieOrigin(req);
		return this.tenantAuth.updateProfile(claims.sub, claims.tenantId, dto);
	}

	/**
	 * R0-03 step 4 demo: route guarded by both AccessTokenGuard (JWT verify)
	 * + PermissionGuard (@RequirePermission('admin.user:view')). Used to
	 * verify the wiring end-to-end before R1/R2 endpoints rely on it.
	 */
	@Get('admin/ping')
	@UseGuards(AccessTokenGuard, PermissionGuard)
	@RequirePermission('admin.user:view')
	adminPing(@Req() req: AuthedRequest) {
		return { ok: true, adminId: req.user.id };
	}
}
