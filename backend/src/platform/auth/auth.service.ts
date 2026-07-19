import { randomUUID } from 'node:crypto';
import {
	ForbiddenException,
	Injectable,
	Logger,
	ServiceUnavailableException,
	UnauthorizedException,
} from '@nestjs/common';
import { SUPER_ADMIN_ROLE_CODE } from '../admin-users/admin.constants';
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
	private readonly logger = new Logger(AuthService.name);

	constructor(
		private readonly prisma: PrismaService,
		private readonly passwords: PasswordService,
		private readonly tokens: TokenService,
		private readonly store: RefreshTokenStore,
	) {}

	/**
	 * Bọc các thao tác Redis: lỗi Redis -> 503 (fail closed, R9.1),
	 * thay vì để ioredis throw thành 500. Log lỗi gốc ở level warn để operator
	 * không mất dấu incident khi stack fail-closed.
	 */
	private async redisGuard<T>(op: () => Promise<T>): Promise<T> {
		try {
			return await op();
		} catch (err) {
			this.logger.warn(`redis op failed: ${(err as Error).message}`);
			throw new ServiceUnavailableException('Auth store unavailable');
		}
	}

	/**
	 * R5.1/R5.2: load `roleCodes` + `permissions` for an admin from the
	 * `admin_role_assignment` join. Single `findMany` avoids N+1 (R0-02 step 1).
	 *
	 * F-07 fix: filters on `role.isAdmin = true`, NOT `role.isSystem = false`.
	 * `SUPER_ADMIN` system role has BOTH `isSystem=true` AND `isAdmin=true`,
	 * so the old `isSystem:false` filter excluded the only role that the
	 * super-admin shortcut (R4.2) depends on.
	 */
	private async loadAdminPermissions(
		adminId: string,
	): Promise<{ roleCodes: string[]; permissions: string[] }> {
		const rows = await this.prisma.adminRoleAssignment.findMany({
			where: { adminId, role: { tenantId: null, isAdmin: true } },
			select: {
				role: {
					select: {
						code: true,
						permissions: {
							select: { permission: { select: { code: true } } },
						},
					},
				},
			},
		});
		const roleCodes = [...new Set(rows.map((r) => r.role.code))];
		const permissions = [
			...new Set(
				rows.flatMap((r) =>
					r.role.permissions.map((p) => p.permission.code),
				),
			),
		];
		return { roleCodes, permissions };
	}

	/**
	 * R8.2: legacy SUPER_ADMIN bootstrap path. When an admin whose `role`
	 * enum column is `SUPER_ADMIN` logs in for the first time after RBAC
	 * migration and has NO `admin_role_assignment` rows, auto-create the
	 * assignment to the seeded system SUPER_ADMIN role.
	 *
	 * F-08 fix: wrapped in `prisma.$transaction` + `upsert` keyed on the
	 * unique `[adminId, roleId]` constraint. Concurrent first-time logins
	 * both return 200 with non-empty permissions.
	 */
	private async ensureSuperAdminAssignment(admin: {
		id: string;
		role: string;
	}): Promise<void> {
		if (admin.role !== SUPER_ADMIN_ROLE_CODE) return;

		const count = await this.prisma.adminRoleAssignment.count({
			where: { adminId: admin.id },
		});
		if (count > 0) return;

		const superAdminRole = await this.prisma.role.findFirst({
			where: {
				code: SUPER_ADMIN_ROLE_CODE,
				isAdmin: true,
				tenantId: null,
			},
			select: { id: true },
		});
		if (!superAdminRole) {
			// R8.2 path can't recover if the system role wasn't seeded.
			// Caller will see empty permissions[]; guard denies everything
			// until operator runs seed.
			return;
		}

		await this.prisma.$transaction([
			this.prisma.adminRoleAssignment.upsert({
				where: {
					adminId_roleId: { adminId: admin.id, roleId: superAdminRole.id },
				},
				update: {},
				create: {
					adminId: admin.id,
					roleId: superAdminRole.id,
					assignedBy: null,
				},
			}),
		]);
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

		// R8.2: auto-assign before computing permissions so first login
		// populates the joined data.
		await this.ensureSuperAdminAssignment(admin);

		const { roleCodes, permissions } = await this.loadAdminPermissions(
			admin.id,
		);

		const identity: AdminIdentity = {
			id: admin.id,
			email: admin.email,
			role: roleCodes.join(','),
			roleCodes,
			permissions,
		};
		const familyId = randomUUID();

		// Durable-first: cap nhat DB + audit truoc, Redis cuoi cung.
		await this.prisma.platformAdmin.update({
			where: { id: admin.id },
			data: { lastLoginAt: new Date() },
		});
		// R6.2: actor_role_code is the role code authorizing this action.
		// For login the actor is "themselves" — use roleCodes joined with ','.
		await this.prisma.auditLog.create({
			data: {
				actorType: 'PLATFORM_ADMIN',
				actorId: admin.id,
				actorRoleCode: roleCodes.join(',') || null,
				action: 'LOGIN',
				ipAddress: ctx.ip,
				userAgent: ctx.userAgent,
			},
		});

		const accessToken = this.tokens.signAccess(identity, familyId);
		const refreshToken = this.tokens.signRefresh(admin.id, familyId);
		// F-09: pass adminId to maintain per-admin reverse index.
		await this.redisGuard(() =>
			this.store.open(familyId, refreshToken, this.refreshTtlSec, admin.id),
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
	): Promise<{
		id: string;
		email: string;
		fullName: string;
		role: string;
		roleCodes: string[];
		permissions: string[];
	}> {
		const admin = await this.prisma.platformAdmin.findUnique({
			where: { id: adminId },
		});
		if (!admin) {
			throw new UnauthorizedException('Admin not found');
		}
		const { roleCodes, permissions } = await this.loadAdminPermissions(
			admin.id,
		);
		return {
			id: admin.id,
			email: admin.email,
			fullName: admin.fullName,
			role: roleCodes.join(','),
			roleCodes,
			permissions,
		};
	}

	/**
	 * Rotate refresh token. Re-load admin, tu choi neu khong ACTIVE (+revoke family),
	 * re-derive role tu DB khi ky access moi. Reuse ngoai grace -> audit + 401.
	 */
	async refresh(
		rawRefreshToken: string,
		ctx?: RequestCtx,
	): Promise<{
		accessToken: string;
		refreshToken: string;
		refreshTtlSec: number;
	}> {
		const claims = this.tokens.verifyRefresh(rawRefreshToken);

		const admin = await this.prisma.platformAdmin.findUnique({
			where: { id: claims.sub },
		});
		if (admin?.status !== 'ACTIVE') {
			// F-09: revokeFamily takes adminId to clean up the per-admin index.
			await this.redisGuard(() =>
				this.store.revokeFamily(claims.familyId, admin?.id),
			);
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
					actorRoleCode: null,
					action: 'REFRESH_REUSE_DETECTED',
					ipAddress: ctx?.ip,
					userAgent: ctx?.userAgent,
				},
			});
			throw new UnauthorizedException('Refresh token reuse detected');
		}
		if (result === 'missing') {
			throw new UnauthorizedException('Refresh session not found');
		}

		// R5.2: re-compute roleCodes + permissions from DB on rotate so the
		// new access token reflects any role assignment changes since the
		// previous sign.
		const { roleCodes, permissions } = await this.loadAdminPermissions(
			admin.id,
		);
		const identity: AdminIdentity = {
			id: admin.id,
			email: admin.email,
			role: roleCodes.join(','),
			roleCodes,
			permissions,
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
			// F-09: revokeFamily takes adminId to clean up the per-admin index.
			await this.store.revokeFamily(claims.familyId, claims.sub);
		});
		await this.prisma.auditLog.create({
			data: {
				actorType: 'PLATFORM_ADMIN',
				actorId: claims.sub,
				actorRoleCode: claims.roleCodes?.join(',') ?? claims.role ?? null,
				action: 'LOGOUT',
				ipAddress: ctx.ip,
				userAgent: ctx.userAgent,
			},
		});
	}
}
