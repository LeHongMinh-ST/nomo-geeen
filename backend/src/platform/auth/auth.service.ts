import { randomUUID } from 'node:crypto';
import {
	ForbiddenException,
	Injectable,
	ServiceUnavailableException,
	UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DECOY_HASH, PasswordService } from './password.service';
import { RefreshTokenStore, remainingTtlSec } from './refresh-token.store';
import {
	type AccessClaims,
	type AdminIdentity,
	TokenService,
} from './token.service';

export interface RequestCtx {
	ip?: string;
	userAgent?: string;
}

/** Cua so grace (giay) cho refresh dong thoi tu 1 client — accept token vua bi rotate. */
export const ROTATE_GRACE_SEC = 10;

export interface AuthResult {
	accessToken: string;
	refreshToken: string;
	refreshTtlSec: number;
	admin: AdminIdentity & { fullName: string };
}

/**
 * Chuyen chuoi TTL kieu '30d'/'15m'/'3600s' sang giay. Fallback 30 ngay.
 */
export function ttlToSeconds(ttl: string): number {
	const m = ttl.match(/^(\d+)([smhd])$/);
	if (!m) return 2592000;
	const n = Number(m[1]);
	const unit = m[2];
	const mult =
		unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 3600 : 86400;
	return n * mult;
}

@Injectable()
export class AuthService {
	private readonly refreshTtlSec = ttlToSeconds(
		process.env.JWT_REFRESH_TTL ?? '30d',
	);

	constructor(
		private readonly prisma: PrismaService,
		private readonly passwords: PasswordService,
		private readonly tokens: TokenService,
		private readonly store: RefreshTokenStore,
	) {}

	/**
	 * Bọc các thao tác Redis: lỗi Redis -> 503 (fail closed, R9.1),
	 * thay vì để ioredis throw thành 500.
	 */
	private async redisGuard<T>(op: () => Promise<T>): Promise<T> {
		try {
			return await op();
		} catch {
			throw new ServiceUnavailableException('Auth store unavailable');
		}
	}

	/**
	 * Dang nhap PlatformAdmin. Generic 401 (constant-time voi decoy), 403 khi DISABLED.
	 * Thu tu: verify -> ghi DB (lastLoginAt + audit) -> mo family Redis cuoi cung.
	 */
	async login(
		email: string,
		password: string,
		ctx: RequestCtx,
	): Promise<AuthResult> {
		const admin = await this.prisma.platformAdmin.findUnique({
			where: { email },
		});

		if (!admin) {
			// Constant-time: verify decoy de khong lo "khong co admin" qua thoi gian.
			await this.passwords.verify(DECOY_HASH, password);
			throw new UnauthorizedException('Invalid credentials');
		}

		const ok = await this.passwords.verify(admin.passwordHash, password);
		if (!ok) {
			throw new UnauthorizedException('Invalid credentials');
		}

		if (admin.status === 'DISABLED') {
			throw new ForbiddenException('Account disabled');
		}

		const identity: AdminIdentity = {
			id: admin.id,
			email: admin.email,
			role: admin.role,
		};
		const familyId = randomUUID();

		// Durable-first: cap nhat DB + audit truoc, Redis cuoi cung.
		await this.prisma.platformAdmin.update({
			where: { id: admin.id },
			data: { lastLoginAt: new Date() },
		});
		await this.prisma.auditLog.create({
			data: {
				actorType: 'PLATFORM_ADMIN',
				actorId: admin.id,
				action: 'LOGIN',
				ipAddress: ctx.ip,
				userAgent: ctx.userAgent,
			},
		});

		const accessToken = this.tokens.signAccess(identity, familyId);
		const refreshToken = this.tokens.signRefresh(admin.id, familyId);
		await this.redisGuard(() =>
			this.store.open(familyId, refreshToken, this.refreshTtlSec),
		);

		return {
			accessToken,
			refreshToken,
			refreshTtlSec: this.refreshTtlSec,
			admin: { ...identity, fullName: admin.fullName },
		};
	}

	async me(
		adminId: string,
	): Promise<{ id: string; email: string; fullName: string; role: string }> {
		const admin = await this.prisma.platformAdmin.findUnique({
			where: { id: adminId },
		});
		if (!admin) {
			throw new UnauthorizedException('Admin not found');
		}
		return {
			id: admin.id,
			email: admin.email,
			fullName: admin.fullName,
			role: admin.role,
		};
	}

	/**
	 * Rotate refresh token. Re-load admin, tu choi neu khong ACTIVE (+revoke family),
	 * re-derive role tu DB khi ky access moi. Reuse ngoai grace -> audit + 401.
	 */
	async refresh(rawRefreshToken: string): Promise<{
		accessToken: string;
		refreshToken: string;
		refreshTtlSec: number;
	}> {
		const claims = this.tokens.verifyRefresh(rawRefreshToken);

		const admin = await this.prisma.platformAdmin.findUnique({
			where: { id: claims.sub },
		});
		if (admin?.status !== 'ACTIVE') {
			await this.redisGuard(() => this.store.revokeFamily(claims.familyId));
			throw new UnauthorizedException('Refresh not allowed');
		}

		const newRefresh = this.tokens.signRefresh(admin.id, claims.familyId);
		const result = await this.redisGuard(() =>
			this.store.rotate(
				claims.familyId,
				rawRefreshToken,
				newRefresh,
				this.refreshTtlSec,
				ROTATE_GRACE_SEC,
			),
		);

		if (result === 'reuse') {
			await this.prisma.auditLog.create({
				data: {
					actorType: 'PLATFORM_ADMIN',
					actorId: admin.id,
					action: 'REFRESH_REUSE_DETECTED',
				},
			});
			throw new UnauthorizedException('Refresh token reuse detected');
		}
		if (result === 'missing') {
			throw new UnauthorizedException('Refresh session not found');
		}

		const identity: AdminIdentity = {
			id: admin.id,
			email: admin.email,
			role: admin.role,
		};
		const accessToken = this.tokens.signAccess(identity, claims.familyId);
		return {
			accessToken,
			refreshToken: newRefresh,
			refreshTtlSec: this.refreshTtlSec,
		};
	}

	/**
	 * Logout: blacklist access token (TTL con lai), revoke family tu familyId trong
	 * access claim (khong dua vao refresh cookie), ghi audit LOGOUT.
	 * Chap nhan access token het han nhung con hop le chu ky (phien idle).
	 */
	async logout(rawAccessToken: string, ctx: RequestCtx): Promise<void> {
		let claims: AccessClaims;
		try {
			claims = this.tokens.verifyAccess(rawAccessToken);
		} catch {
			// Cho phep token het han nhung con hop le chu ky de revoke phien idle.
			claims = this.tokens.decodeExpiredAccess(rawAccessToken);
		}

		const ttl = claims.exp ? remainingTtlSec(claims.exp) : 1;
		await this.redisGuard(async () => {
			await this.store.blacklistAccess(rawAccessToken, ttl);
			await this.store.revokeFamily(claims.familyId);
		});
		await this.prisma.auditLog.create({
			data: {
				actorType: 'PLATFORM_ADMIN',
				actorId: claims.sub,
				action: 'LOGOUT',
				ipAddress: ctx.ip,
				userAgent: ctx.userAgent,
			},
		});
	}
}
