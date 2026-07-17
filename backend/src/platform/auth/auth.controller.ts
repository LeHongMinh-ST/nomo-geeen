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
import { AdminLoginDto } from './dto/admin-login.dto';
import { AccessTokenGuard } from './guards/access-token.guard';
import type { AdminIdentity } from './token.service';

const REFRESH_COOKIE = 'nomo_admin_rt';

function cookieSecure(): boolean {
	return process.env.AUTH_COOKIE_SECURE !== 'false';
}

function refreshCookieOptions(maxAgeMs?: number) {
	return {
		httpOnly: true,
		secure: cookieSecure(),
		sameSite: 'strict' as const,
		path: '/auth',
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
			throw new UnauthorizedException('Missing refresh token');
		}
		const result = await this.auth.refresh(cookie);
		res.cookie(
			REFRESH_COOKIE,
			result.refreshToken,
			refreshCookieOptions(result.refreshTtlSec * 1000),
		);
		return { accessToken: result.accessToken };
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
		return this.auth.me(req.user.id);
	}
}
