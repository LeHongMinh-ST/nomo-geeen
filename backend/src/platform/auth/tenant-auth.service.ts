import { randomUUID } from 'node:crypto';
import {
	forwardRef,
	HttpException,
	HttpStatus,
	Inject,
	Injectable,
	ServiceUnavailableException,
	UnauthorizedException,
} from '@nestjs/common';
import { AuditAction, AuditActorType } from '@prisma/client';
import { AuditLogger } from '../audit/audit-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import type { ChangeTenantPasswordDto } from './dto/change-tenant-password.dto';
import type { TenantRegisterDto } from './dto/tenant-register.dto';
import type { UpdateTenantProfileDto } from './dto/update-tenant-profile.dto';
import { DECOY_HASH, PasswordService } from './password.service';
import { RefreshTokenStore, remainingTtlSec } from './refresh-token.store';
import {
	type AccessClaims,
	TenantAuthResponse,
	TenantIdentity,
	TokenService,
} from './token.service';

export type TenantRegistrationResult = TenantAuthResponse & {
	refreshToken: string;
	refreshTtlSec: number;
};

// R5.1: nguong that bai truoc khi tam khoa (429). Dem theo (IP, identifier/slug).
const LOGIN_MAX_ATTEMPTS = Number(process.env.USER_LOGIN_MAX_ATTEMPTS ?? 10);

@Injectable()
export class TenantAuthService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly passwords: PasswordService,
		private readonly tokens: TokenService,
		private readonly sessions: RefreshTokenStore,
		private readonly audit: AuditLogger,
		@Inject(forwardRef(() => TenantsService))
		private readonly tenants: TenantsService,
	) {}

	async register(
		dto: TenantRegisterDto,
		context: { ip?: string; userAgent?: string } = {},
	): Promise<TenantRegistrationResult> {
		// R5.1: throttle dang ky cong khai theo (IP, slug) — dung chinh sach
		// bounded Redis nhu login. Fail-open khi Redis loi (R5.4).
		const throttleScope = context.ip ?? '';
		await this.assertLoginNotThrottled(throttleScope, `register:${dto.slug}`);
		const familyId = randomUUID();
		const refreshToken = this.tokens.signTenantRefresh(
			'pending-user',
			'pending-tenant',
			familyId,
		);
		const refreshClaims = this.tokens.verifyTenantRefresh(refreshToken);
		const refreshTtlSec = remainingTtlSec(refreshClaims.exp ?? 0);
		await this.sessions.openUser(familyId, refreshToken, refreshTtlSec);

		try {
			const created = await this.tenants.createPublic({
				tenantName: dto.tenantName,
				slug: dto.slug,
				fullName: dto.fullName,
				username: dto.username,
				email: dto.email,
				phone: dto.phone,
				password: dto.password,
			});
			const user = await this.prisma.user.findUniqueOrThrow({
				where: { id: created.owner.id },
				select: {
					id: true,
					tenantId: true,
					username: true,
					email: true,
					phone: true,
					fullName: true,
					mustChangePassword: true,
					tenant: { select: { slug: true, name: true } },
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
			const permissions = user.role.permissions.map(
				(grant) => grant.permission.code,
			);
			const identity: TenantIdentity = {
				id: user.id,
				tenantId: user.tenantId,
				username: user.username,
				roleCode: user.role.code,
				permissions,
				familyId,
			};
			const accessToken = this.tokens.signTenantAccess(identity, familyId);
			const finalRefreshToken = this.tokens.signTenantRefresh(
				user.id,
				user.tenantId,
				familyId,
			);
			await this.sessions.openUser(
				familyId,
				finalRefreshToken,
				refreshTtlSec,
				user.id,
			);
			// Dang ky thanh cong: xoa bo dem cho (IP, slug).
			await this.clearLoginThrottle(throttleScope, `register:${dto.slug}`);

			return {
				accessToken,
				refreshToken: finalRefreshToken,
				refreshTtlSec,
				user: {
					id: user.id,
					tenantId: user.tenantId,
					tenantSlug: user.tenant.slug,
					tenantName: user.tenant.name,
					username: user.username,
					email: user.email,
					phone: user.phone,
					fullName: user.fullName,
					role: user.role.code,
					permissions,
					mustChangePassword: user.mustChangePassword,
				},
			};
		} catch (error) {
			await this.sessions.revokeUserFamily(familyId);
			throw error;
		}
	}

	async login(
		identifier: string,
		password: string,
		context: { ip?: string; userAgent?: string } = {},
	): Promise<TenantRegistrationResult> {
		const value = identifier.trim();
		// R5.1: dem va chan theo (IP, identifier). Increment truoc khi verify de
		// tinh ca lan nay; clearLoginThrottle se xoa khi dang nhap thanh cong.
		const throttleScope = context.ip ?? '';
		await this.assertLoginNotThrottled(throttleScope, value);
		const candidates = await this.prisma.user.findMany({
			where: {
				status: 'ACTIVE',
				deletedAt: null,
				tenant: { status: 'ACTIVE', deletedAt: null },
				OR: [{ username: value }, { email: value }, { phone: value }],
			},
			include: {
				tenant: { select: { slug: true, name: true } },
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
		let matches: (typeof candidates)[number][] = [];
		if (candidates.length === 0) {
			await this.passwords.verify(DECOY_HASH, password);
		} else {
			matches = (
				await Promise.all(
					candidates.map(async (candidate) =>
						(await this.passwords.verify(candidate.passwordHash, password))
							? candidate
							: null,
					),
				)
			).filter(
				(candidate): candidate is (typeof candidates)[number] =>
					candidate !== null,
			);
		}
		if (matches.length !== 1)
			throw new UnauthorizedException('Invalid credentials');
		const user = matches[0];
		// Dang nhap thanh cong: xoa bo dem that bai cho (IP, identifier).
		await this.clearLoginThrottle(throttleScope, value);

		const permissions = user.role.permissions.map(
			(grant) => grant.permission.code,
		);
		const familyId = randomUUID();
		const identity: TenantIdentity = {
			id: user.id,
			tenantId: user.tenantId,
			username: user.username,
			roleCode: user.role.code,
			permissions,
			familyId,
		};
		const accessToken = this.tokens.signTenantAccess(identity, familyId);
		const refreshToken = this.tokens.signTenantRefresh(
			user.id,
			user.tenantId,
			familyId,
		);
		const refreshTtlSec = remainingTtlSec(
			this.tokens.verifyTenantRefresh(refreshToken).exp ?? 0,
		);
		await this.sessions.openUser(
			familyId,
			refreshToken,
			refreshTtlSec,
			user.id,
		);
		try {
			await this.audit.run(
				{
					tenantId: user.tenantId,
					actorId: user.id,
					actorType: AuditActorType.USER,
					actorRoleCode: user.role.code,
					action: AuditAction.LOGIN,
					resource: 'auth',
					ipAddress: context.ip,
					userAgent: context.userAgent,
				},
				(tx) =>
					tx.user.update({
						where: { id: user.id },
						data: { lastLoginAt: new Date() },
					}),
			);
			return {
				accessToken,
				refreshToken,
				refreshTtlSec,
				user: {
					id: user.id,
					tenantId: user.tenantId,
					tenantSlug: user.tenant.slug,
					tenantName: user.tenant.name,
					username: user.username,
					email: user.email,
					phone: user.phone,
					fullName: user.fullName,
					role: user.role.code,
					permissions,
					mustChangePassword: user.mustChangePassword,
				},
			};
		} catch (error) {
			await this.sessions.revokeUserFamily(familyId, user.id);
			throw error;
		}
	}

	async refreshUser(
		rawRefreshToken: string,
		context: { ip?: string; userAgent?: string } = {},
	): Promise<TenantRegistrationResult> {
		const claims = this.tokens.verifyTenantRefresh(rawRefreshToken);
		const user = await this.findActiveUser(claims.sub, claims.tenantId);
		if (!user) throw new UnauthorizedException('Refresh not allowed');

		const familyId = claims.familyId;
		const identity = this.toIdentity(user, familyId);
		const newRefresh = this.tokens.signTenantRefresh(
			user.id,
			user.tenantId,
			familyId,
		);
		const ttlSec = remainingTtlSec(
			this.tokens.verifyTenantRefresh(newRefresh).exp ?? 0,
		);
		const result = await this.userRedis(() =>
			this.sessions.rotateUser(
				familyId,
				rawRefreshToken,
				newRefresh,
				ttlSec,
				5,
			),
		);
		if (result === 'reuse') {
			await this.audit.log({
				tenantId: user.tenantId,
				actorId: user.id,
				actorType: AuditActorType.USER,
				actorRoleCode: user.role.code,
				action: AuditAction.REFRESH_REUSE_DETECTED,
				resource: 'auth',
				ipAddress: context.ip,
				userAgent: context.userAgent,
			});
			throw new UnauthorizedException('Refresh token reuse detected');
		}
		if (result === 'missing') {
			throw new UnauthorizedException('Refresh session not found');
		}
		await this.userRedis(() =>
			this.sessions.openUser(familyId, newRefresh, ttlSec, user.id),
		);
		return {
			accessToken: this.tokens.signTenantAccess(identity, familyId),
			refreshToken: newRefresh,
			refreshTtlSec: ttlSec,
			user: this.toPublicUser(user),
		};
	}

	async logoutUser(
		rawAccessToken: string,
		claims: AccessClaims,
		context: { ip?: string; userAgent?: string } = {},
	): Promise<void> {
		// H1 fix: dung `claims` da duoc controller decode (ke ca token idle-het-han
		// qua decodeExpiredAccess). KHONG verify strict lai rawAccessToken o day —
		// verify strict se nem 401 voi token het han, khien blacklist/revoke/clear-cookie
		// khong chay va phien "song lai" qua /auth/refresh du da bam Dang xuat (R3.3).
		if (!claims.tenantId)
			throw new UnauthorizedException('Invalid tenant token');
		const user = await this.findActiveUser(claims.sub, claims.tenantId);
		await this.userRedis(async () => {
			await this.sessions.blacklistUserAccess(
				rawAccessToken,
				claims.exp ? remainingTtlSec(claims.exp) : 1,
			);
			await this.sessions.revokeUserFamily(claims.familyId, claims.sub);
		});
		await this.audit.log({
			tenantId: claims.tenantId,
			actorId: claims.sub,
			actorType: AuditActorType.USER,
			actorRoleCode: user?.role.code ?? claims.role ?? null,
			action: AuditAction.LOGOUT,
			resource: 'auth',
			ipAddress: context.ip,
			userAgent: context.userAgent,
		});
	}

	async meUser(
		userId: string,
		tenantId: string,
	): Promise<TenantAuthResponse['user']> {
		const user = await this.findActiveUser(userId, tenantId);
		if (!user) throw new UnauthorizedException('User not found');
		return this.toPublicUser(user);
	}

	/**
	 * R5.1: chan khi so lan that bai vuot nguong (429). Dem theo (scope, identifier)
	 * voi scope = IP (login/register cross-tenant). R5.4: throttle la best-effort —
	 * loi Redis KHONG duoc chan xac thuc (fail-open), chi bo qua buoc dem.
	 */
	private async assertLoginNotThrottled(
		scope: string,
		identifier: string,
	): Promise<void> {
		if (!scope) return;
		let count: number;
		try {
			count = await this.sessions.recordUserLoginFailure(scope, identifier);
		} catch {
			return; // fail-open: Redis loi thi khong chan (R5.4)
		}
		if (count > LOGIN_MAX_ATTEMPTS) {
			throw new HttpException(
				'Too many attempts. Please retry later.',
				HttpStatus.TOO_MANY_REQUESTS,
			);
		}
	}

	private async clearLoginThrottle(
		scope: string,
		identifier: string,
	): Promise<void> {
		if (!scope) return;
		try {
			await this.sessions.clearUserLoginFailures(scope, identifier);
		} catch {
			// best-effort cleanup; khong anh huong ket qua dang nhap
		}
	}

	async profile(userId: string, tenantId: string) {
		const user = await this.findActiveUser(userId, tenantId);
		if (!user) throw new UnauthorizedException('User not found');
		const settings = await this.prisma.tenantSettings.findUnique({
			where: { tenantId },
			select: { address: true },
		});
		return { user: this.toPublicUser(user), address: settings?.address ?? '' };
	}

	async updateProfile(
		userId: string,
		tenantId: string,
		dto: UpdateTenantProfileDto,
	) {
		const current = await this.findActiveUser(userId, tenantId);
		if (!current) throw new UnauthorizedException('User not found');
		await this.audit.run(
			{
				tenantId,
				actorId: userId,
				actorType: AuditActorType.USER,
				actorRoleCode: current.role.code,
				action: AuditAction.TENANT_UPDATE,
				resource: 'profile',
				resourceId: userId,
			},
			async (tx) => {
				await tx.user.update({
					where: { id: userId },
					data: {
						fullName: dto.fullName,
						phone: dto.phone ?? null,
						email: dto.email ?? null,
					},
				});
				await tx.tenantSettings.upsert({
					where: { tenantId },
					create: { tenantId, address: dto.address ?? null },
					update: { address: dto.address ?? null },
				});
				return true;
			},
		);
		const updated = await this.findActiveUser(userId, tenantId);
		if (!updated) throw new UnauthorizedException('User not found');
		const settings = await this.prisma.tenantSettings.findUnique({
			where: { tenantId },
			select: { address: true },
		});
		return { user: this.toPublicUser(updated), address: settings?.address ?? '' };
	}

	async changePassword(
		userId: string,
		tenantId: string,
		familyId: string,
		dto: ChangeTenantPasswordDto,
	): Promise<TenantAuthResponse['user']> {
		const user = await this.prisma.user.findFirst({
			where: {
				id: userId,
				tenantId,
				status: 'ACTIVE',
				deletedAt: null,
				tenant: { status: 'ACTIVE', deletedAt: null },
			},
			include: {
				tenant: { select: { slug: true, name: true } },
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
		if (!user) throw new UnauthorizedException('User not found');
		if (
			!(await this.passwords.verify(user.passwordHash, dto.currentPassword))
		) {
			throw new UnauthorizedException('Invalid current password');
		}
		const passwordHash = await this.passwords.hash(dto.newPassword);
		await this.audit.run(
			{
				tenantId,
				actorId: userId,
				actorType: AuditActorType.USER,
				actorRoleCode: user.role.code,
				action: AuditAction.TENANT_UPDATE,
				resource: 'auth',
			},
			(tx) =>
				tx.user.update({
					where: { id: userId },
					data: { passwordHash, mustChangePassword: false },
				}),
		);
		await this.userRedis(() =>
			this.sessions.revokeOtherUserFamilies(userId, familyId),
		);
		return this.toPublicUser({ ...user, mustChangePassword: false });
	}

	private async findActiveUser(userId: string, tenantId?: string) {
		return this.prisma.user.findFirst({
			where: {
				id: userId,
				...(tenantId ? { tenantId } : {}),
				status: 'ACTIVE',
				deletedAt: null,
				tenant: { status: 'ACTIVE', deletedAt: null },
			},
			include: {
				tenant: { select: { slug: true, name: true } },
				role: {
					select: {
						code: true,
						permissions: { select: { permission: { select: { code: true } } } },
					},
				},
			},
		});
	}

	private toIdentity(
		user: NonNullable<Awaited<ReturnType<TenantAuthService['findActiveUser']>>>,
		familyId: string,
	): TenantIdentity {
		return {
			id: user.id,
			tenantId: user.tenantId,
			username: user.username,
			roleCode: user.role.code,
			permissions: user.role.permissions.map((grant) => grant.permission.code),
			familyId,
		};
	}

	private toPublicUser(
		user: NonNullable<Awaited<ReturnType<TenantAuthService['findActiveUser']>>>,
	) {
		return {
			id: user.id,
			tenantId: user.tenantId,
			tenantSlug: user.tenant.slug,
			tenantName: user.tenant.name,
			username: user.username,
			email: user.email,
			phone: user.phone,
			fullName: user.fullName,
			role: user.role.code,
			permissions: user.role.permissions.map((grant) => grant.permission.code),
			mustChangePassword: user.mustChangePassword,
		};
	}

	private async userRedis<T>(operation: () => Promise<T>): Promise<T> {
		try {
			return await operation();
		} catch {
			throw new ServiceUnavailableException('Auth store unavailable');
		}
	}
}
