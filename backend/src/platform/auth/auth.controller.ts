import {
	Body,
	Controller,
	Get,
	HttpCode,
	Post,
	Req,
	Res,
	UnauthorizedException,
	UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { RequirePermission } from './decorators/require-permission.decorator';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AccessTokenGuard } from './guards/access-token.guard';
import { PermissionGuard } from './guards/permission.guard';
import type { AdminIdentity } from './token.service';

const REFRESH_COOKIE = 'nomo_admin_rt';

function cookieSecure(): boolean {
	return process.env.AUTH_COOKIE_SECURE !== 'false';
}

function refreshCookieOptions(maxAgeMs?: number) {
	const isDev = process.env.NODE_ENV !== 'production';
	// SameSite=None + Secure=true can thiet de browser gui cookie HttpOnly
	// cross-origin qua fetch() tu FE (:3000) den backend (:3001) voi
	// credentials: 'include'. SameSite=Lax chi cho phep top-level navigation,
	// khong gui kem cross-origin fetch POST -> /auth/refresh 401 khi F5.
	// Chrome co exception cho localhost (treated as secure context) nen
	// `secure: true` cung hoat dong o dev khong can HTTPS that su.
	return {
		httpOnly: true,
		secure: isDev ? true : cookieSecure(),
		sameSite: 'none' as const,
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
	constructor(private readonly auth: AuthService) {}

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
		const cookie = (req.cookies as Record<string, string> | undefined)?.[
			REFRESH_COOKIE
		];
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
				`[auth/refresh] 401 reason=${
					(err as Error).message ?? 'unknown'
				}`,
			);
			throw err;
		}
	}

	@Post('logout')
	@HttpCode(204)
	async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
		const token = bearerToken(req);
		await this.auth.logout(token, {
			ip: req.ip,
			userAgent: req.get('user-agent') ?? undefined,
		});
		res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
	}

	@Get('me')
	@UseGuards(AccessTokenGuard)
	async me(@Req() req: AuthedRequest) {
		try {
			const admin = await this.auth.me(req.user.id);
			console.log(
				`[auth/me] 200 adminId=${admin.id} roleCodes=${JSON.stringify(
					admin.roleCodes,
				)} permissions=${admin.permissions.length}`,
			);
			return admin;
		} catch (err) {
			console.log(`[auth/me] ERR reason=${(err as Error).message ?? 'unknown'}`);
			throw err;
		}
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
