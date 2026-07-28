import { randomUUID } from 'node:crypto';
import {
	Injectable,
	ServiceUnavailableException,
	UnauthorizedException,
} from '@nestjs/common';
import { AuditAction, AuditActorType } from '@prisma/client';
import {
	generateAuthenticationOptions,
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
} from '@simplewebauthn/server';
import { AuditLogger } from '../audit/audit-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TenantAuthService } from './tenant-auth.service';

const TTL = 300;
type Challenge = {
	type: 'registration' | 'authentication';
	challenge: string;
	userId?: string;
	tenantId?: string;
	familyId?: string;
	challengeId: string;
};
export function isSignCountValid(previous: number, next: number) {
	return previous === 0 ? next >= 0 : next > previous;
}

@Injectable()
export class PasskeyService {
	private readonly enabled = process.env.WEBAUTHN_ENABLED === 'true';
	private readonly rpID = process.env.WEBAUTHN_RP_ID ?? '';
	private readonly origin = process.env.WEBAUTHN_ORIGIN ?? '';
	private readonly rpName = process.env.WEBAUTHN_RP_NAME ?? 'NomoGreen';

	constructor(
		private readonly prisma: PrismaService,
		private readonly redis: RedisService,
		private readonly audit: AuditLogger,
		private readonly tenantAuth: TenantAuthService,
	) {
		if (this.enabled && (!this.rpID || !this.origin))
			throw new Error('WEBAUTHN_RP_ID and WEBAUTHN_ORIGIN are required');
	}

	private assertEnabled() {
		if (!this.enabled) throw new UnauthorizedException('Passkey chưa được bật');
		if (!this.rpID || !this.origin)
			throw new ServiceUnavailableException(
				'Passkey configuration unavailable',
			);
	}
	private key(id: string) {
		return `webauthn:challenge:${id}`;
	}

	private async save(challenge: Challenge) {
		try {
			await this.redis.set(
				this.key(challenge.challengeId),
				JSON.stringify(challenge),
				TTL,
			);
		} catch {
			throw new ServiceUnavailableException('Auth store unavailable');
		}
	}

	private async consume(id: string): Promise<Challenge> {
		try {
			const raw = (await this.redis.eval(
				"local v=redis.call('get',KEYS[1]); if v then redis.call('del',KEYS[1]); end; return v",
				1,
				this.key(id),
			)) as string | null;
			if (!raw)
				throw new UnauthorizedException('Challenge expired or already used');
			return JSON.parse(raw) as Challenge;
		} catch (error) {
			if (error instanceof UnauthorizedException) throw error;
			throw new ServiceUnavailableException('Auth store unavailable');
		}
	}

	private async recordFailure(
		challenge: Challenge | undefined,
		reason: string,
		context: { ip?: string; userAgent?: string },
		userId?: string,
		tenantId?: string,
	): Promise<void> {
		const actorId = userId ?? challenge?.userId ?? null;
		const actorTenantId = tenantId ?? challenge?.tenantId;
		const actorType =
			actorId && actorTenantId ? AuditActorType.USER : AuditActorType.SYSTEM;
		try {
			await this.audit.log({
				tenantId: actorType === AuditActorType.USER ? actorTenantId : undefined,
				actorId: actorType === AuditActorType.USER ? actorId : null,
				actorType,
				actorRoleCode: null,
				action: AuditAction.PASSKEY_FAILURE,
				resource: 'passkey',
				after: { reason, type: challenge?.type ?? 'unknown' },
				ipAddress: context.ip,
				userAgent: context.userAgent,
			});
		} catch {
			throw new ServiceUnavailableException('Auth audit unavailable');
		}
	}

	private async reject(
		challenge: Challenge | undefined,
		reason: string,
		context: { ip?: string; userAgent?: string },
		userId?: string,
		tenantId?: string,
	): Promise<never> {
		await this.recordFailure(challenge, reason, context, userId, tenantId);
		throw new UnauthorizedException('Passkey authentication failed');
	}

	private async user(userId: string, tenantId: string) {
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
						permissions: { select: { permission: { select: { code: true } } } },
					},
				},
			},
		});
		if (!user) throw new UnauthorizedException('User not found');
		return user;
	}

	async registrationOptions(
		userId: string,
		tenantId: string,
		familyId: string,
	) {
		this.assertEnabled();
		const user = await this.user(userId, tenantId);
		const existing = await this.prisma.passkey.findMany({
			where: { userId, revokedAt: null },
			select: { credentialId: true, transports: true },
		});
		const challengeId = randomUUID();
		const options = await generateRegistrationOptions({
			rpName: this.rpName,
			rpID: this.rpID,
			userName: user.username,
			userID: new TextEncoder().encode(user.id),
			attestationType: 'none',
			excludeCredentials: existing.map((item) => ({
				id: item.credentialId,
				transports: (item.transports as any) ?? undefined,
			})),
			authenticatorSelection: {
				residentKey: 'preferred',
				userVerification: 'required',
				authenticatorAttachment: 'platform',
			},
		});
		await this.save({
			type: 'registration',
			challenge: options.challenge,
			challengeId,
			userId,
			tenantId,
			familyId,
		});
		return { challengeId, options };
	}

	async registrationVerify(
		userId: string,
		tenantId: string,
		familyId: string,
		challengeId: string,
		response: any,
	) {
		this.assertEnabled();
		let challenge: Challenge;
		try {
			challenge = await this.consume(challengeId);
		} catch {
			await this.recordFailure(
				undefined,
				'challenge_missing',
				{},
				userId,
				tenantId,
			);
			throw new UnauthorizedException('Challenge expired or already used');
		}
		if (
			challenge.type !== 'registration' ||
			challenge.userId !== userId ||
			challenge.tenantId !== tenantId ||
			challenge.familyId !== familyId
		)
			return this.reject(challenge, 'challenge_mismatch', {}, userId, tenantId);
		let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
		try {
			verification = await verifyRegistrationResponse({
				response,
				expectedChallenge: challenge.challenge,
				expectedOrigin: this.origin,
				expectedRPID: this.rpID,
				requireUserVerification: true,
			});
		} catch {
			return this.reject(
				challenge,
				'registration_signature_failure',
				{},
				userId,
				tenantId,
			);
		}
		if (!verification.verified || !verification.registrationInfo)
			return this.reject(
				challenge,
				'registration_verification_failure',
				{},
				userId,
				tenantId,
			);
		const info = verification.registrationInfo;
		const credentialId = info.credential.id;
		const duplicate = await this.prisma.passkey.findUnique({
			where: { credentialId },
		});
		if (duplicate)
			return this.reject(
				challenge,
				'credential_duplicate',
				{},
				userId,
				tenantId,
			);
		await this.prisma.passkey.create({
			data: {
				userId,
				credentialId,
				publicKey: Buffer.from(info.credential.publicKey),
				signCount: info.credential.counter,
				transports: response.response?.transports ?? [],
				deviceType: info.credentialDeviceType,
				backedUp: info.credentialBackedUp,
				aaguid: info.aaguid,
				label: 'Thiết bị đăng nhập',
			},
		});
		return {
			id: credentialId,
			message: 'Đã bật đăng nhập bằng Face ID hoặc sinh trắc học.',
		};
	}

	async authenticationOptions(identifier?: string) {
		this.assertEnabled();
		const users = identifier
			? await this.prisma.user.findMany({
					where: {
						status: 'ACTIVE',
						deletedAt: null,
						OR: [
							{ username: identifier },
							{ email: identifier },
							{ phone: identifier },
						],
						tenant: { status: 'ACTIVE', deletedAt: null },
					},
					select: { id: true, tenantId: true },
				})
			: [];
		const credentials =
			users.length === 1
				? await this.prisma.passkey.findMany({
						where: { userId: users[0].id, revokedAt: null },
						select: { credentialId: true, transports: true },
					})
				: [];
		const challengeId = randomUUID();
		const options = await generateAuthenticationOptions({
			rpID: this.rpID,
			userVerification: 'required',
			allowCredentials: credentials.map((item) => ({
				id: item.credentialId,
				transports: (item.transports as any) ?? undefined,
			})),
		});
		await this.save({
			type: 'authentication',
			challenge: options.challenge,
			challengeId,
			...(users.length === 1
				? { userId: users[0].id, tenantId: users[0].tenantId }
				: {}),
		});
		return { challengeId, options };
	}

	async authenticationVerify(
		challengeId: string,
		response: any,
		context: { ip?: string; userAgent?: string } = {},
	) {
		this.assertEnabled();
		let challenge: Challenge;
		try {
			challenge = await this.consume(challengeId);
		} catch {
			await this.recordFailure(undefined, 'challenge_missing', context);
			throw new UnauthorizedException('Challenge expired or already used');
		}
		if (challenge.type !== 'authentication')
			return this.reject(challenge, 'challenge_type_mismatch', context);
		const credential = await this.prisma.passkey.findUnique({
			where: { credentialId: response.id },
			include: { user: true },
		});
		if (
			!credential ||
			credential.revokedAt ||
			credential.user.status !== 'ACTIVE' ||
			credential.user.deletedAt ||
			(challenge.userId && challenge.userId !== credential.userId)
		)
			return this.reject(
				challenge,
				'credential_missing_or_revoked',
				context,
				credential?.userId,
				credential?.user?.tenantId,
			);
		let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
		try {
			verification = await verifyAuthenticationResponse({
				response,
				expectedChallenge: challenge.challenge,
				expectedOrigin: this.origin,
				expectedRPID: this.rpID,
				credential: {
					id: credential.credentialId,
					publicKey: new Uint8Array(credential.publicKey),
					counter: credential.signCount,
					transports: (credential.transports as any) ?? undefined,
				},
				requireUserVerification: true,
			});
		} catch {
			return this.reject(
				challenge,
				'assertion_signature_failure',
				context,
				credential.userId,
				credential.user.tenantId,
			);
		}
		if (
			!verification.verified ||
			!isSignCountValid(
				credential.signCount,
				verification.authenticationInfo.newCounter,
			)
		)
			return this.reject(
				challenge,
				'sign_count_failure',
				context,
				credential.userId,
				credential.user.tenantId,
			);
		const update = await this.prisma.passkey.updateMany({
			where: {
				id: credential.id,
				signCount: credential.signCount,
				version: credential.version,
				revokedAt: null,
			},
			data: {
				signCount: verification.authenticationInfo.newCounter,
				version: { increment: 1 },
				lastUsedAt: new Date(),
			},
		});
		if (update.count !== 1)
			return this.reject(
				challenge,
				'concurrent_assertion',
				context,
				credential.userId,
				credential.user.tenantId,
			);
		try {
			return await this.tenantAuth.createSessionForUser(
				credential.userId,
				credential.user.tenantId,
				context,
			);
		} catch (error) {
			await this.recordFailure(
				challenge,
				'session_issuance_failure',
				context,
				credential.userId,
				credential.user.tenantId,
			);
			throw error;
		}
	}

	async list(userId: string, tenantId: string) {
		this.assertEnabled();
		await this.user(userId, tenantId);
		return this.prisma.passkey.findMany({
			where: { userId, revokedAt: null },
			select: {
				id: true,
				label: true,
				deviceType: true,
				backedUp: true,
				createdAt: true,
				lastUsedAt: true,
			},
		});
	}

	async revoke(userId: string, tenantId: string, id: string) {
		this.assertEnabled();
		await this.user(userId, tenantId);
		const item = await this.prisma.passkey.updateMany({
			where: { id, userId, revokedAt: null },
			data: { revokedAt: new Date() },
		});
		if (!item.count) throw new UnauthorizedException('Passkey not found');
		return { message: 'Đã thu hồi thiết bị đăng nhập.' };
	}
}
