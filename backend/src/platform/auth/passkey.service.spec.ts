jest.mock('@simplewebauthn/server', () => ({
	...jest.requireActual('@simplewebauthn/server'),
	generateRegistrationOptions: jest.fn(),
	verifyRegistrationResponse: jest.fn(),
	verifyAuthenticationResponse: jest.fn(),
}));

import { UnauthorizedException } from '@nestjs/common';
import {
	generateRegistrationOptions,
	verifyAuthenticationResponse,
	verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type { AuditLogger } from '../audit/audit-logger.service';
import { isSignCountValid, PasskeyService } from './passkey.service';

const webauthn = {
	generateRegistrationOptions: generateRegistrationOptions as jest.Mock,
	verifyRegistrationResponse: verifyRegistrationResponse as jest.Mock,
	verifyAuthenticationResponse: verifyAuthenticationResponse as jest.Mock,
};

describe('PasskeyService security boundaries', () => {
	afterEach(() => {
		jest.resetAllMocks();
		delete process.env.WEBAUTHN_ENABLED;
		delete process.env.WEBAUTHN_RP_ID;
		delete process.env.WEBAUTHN_ORIGIN;
	});
	function configure() {
		process.env.WEBAUTHN_ENABLED = 'true';
		process.env.WEBAUTHN_RP_ID = 'localhost';
		process.env.WEBAUTHN_ORIGIN = 'http://localhost:3000';
	}
	function challenge(type = 'authentication') {
		return JSON.stringify({
			type,
			challenge: 'server-challenge',
			challengeId: 'challenge-1',
			userId: 'u1',
			tenantId: 't1',
			familyId: 'family-1',
		});
	}
	function base() {
		const prisma = {
			user: { findFirst: jest.fn(), findMany: jest.fn() },
			passkey: {
				findMany: jest.fn(),
				findUnique: jest.fn(),
				create: jest.fn(),
				updateMany: jest.fn(),
			},
		};
		const redis = {
			set: jest.fn(),
			eval: jest.fn().mockResolvedValue(challenge()),
		};
		const audit: Pick<AuditLogger, 'log'> = {
			log: jest.fn(
				async (_input: Parameters<AuditLogger['log']>[0]) => undefined,
			),
		};
		const tenantAuth = {
			createSessionForUser: jest.fn().mockResolvedValue({
				accessToken: 'a',
				refreshToken: 'r',
				refreshTtlSec: 10,
				user: { id: 'u1' },
			}),
		};
		return {
			prisma,
			redis,
			audit,
			tenantAuth,
			service: new PasskeyService(
				prisma as never,
				redis as never,
				audit as never,
				tenantAuth as never,
			),
		};
	}
	it('fails closed when disabled', async () => {
		const { service } = base();
		await expect(service.authenticationOptions()).rejects.toThrow(
			UnauthorizedException,
		);
	});
	it('consumes a challenge exactly once', async () => {
		const redis = {
			eval: jest
				.fn()
				.mockResolvedValueOnce(challenge())
				.mockResolvedValueOnce(null),
		};
		const service = new PasskeyService(
			{} as never,
			redis as never,
			{} as never,
			{} as never,
		);
		const consume = (
			service as never as { consume: (id: string) => Promise<unknown> }
		).consume.bind(service);
		await expect(consume('x')).resolves.toMatchObject({
			challengeId: 'challenge-1',
		});
		await expect(consume('x')).rejects.toThrow('Challenge expired');
		expect(redis.eval).toHaveBeenCalledTimes(2);
	});
	it('accepts monotonic counters and rejects equal or rollback for established authenticators', () => {
		expect(isSignCountValid(0, 0)).toBe(true);
		expect(isSignCountValid(0, 1)).toBe(true);
		expect(isSignCountValid(4, 5)).toBe(true);
		expect(isSignCountValid(4, 4)).toBe(false);
		expect(isSignCountValid(5, 4)).toBe(false);
	});
	it('registers after valid options and verification', async () => {
		configure();
		const { service, prisma, redis } = base();
		redis.eval.mockResolvedValueOnce(challenge('registration'));
		prisma.user.findFirst.mockResolvedValue({
			id: 'u1',
			username: 'owner',
			tenant: { slug: 't', name: 'T' },
			role: { code: 'OWNER', permissions: {} },
		});
		prisma.passkey.findMany.mockResolvedValue([]);
		prisma.passkey.findUnique.mockResolvedValue(null);
		webauthn.generateRegistrationOptions.mockResolvedValue({
			challenge: 'server-challenge',
		});
		webauthn.verifyRegistrationResponse.mockResolvedValue({
			verified: true,
			registrationInfo: {
				credential: {
					id: 'cred-1',
					publicKey: new Uint8Array([1]),
					counter: 0,
				},
				credentialDeviceType: 'singleDevice',
				credentialBackedUp: false,
				aaguid: 'a',
			},
		});
		const result = await service.registrationVerify(
			'u1',
			't1',
			'family-1',
			'challenge-1',
			{ id: 'cred-1', response: {} },
		);
		expect(result.id).toBe('cred-1');
		expect(prisma.passkey.create).toHaveBeenCalled();
		expect(redis.eval).toHaveBeenCalled();
	});
	it('audits assertion signature failure without exposing credential', async () => {
		configure();
		const { service, prisma, audit } = base();
		prisma.passkey.findUnique.mockResolvedValue({
			id: 'pk',
			userId: 'u1',
			credentialId: 'cred-1',
			publicKey: new Uint8Array([1]),
			signCount: 0,
			version: 2,
			transports: [],
			revokedAt: null,
			user: { id: 'u1', tenantId: 't1', status: 'ACTIVE', deletedAt: null },
		});
		webauthn.verifyAuthenticationResponse.mockRejectedValue(
			new Error('bad assertion'),
		);
		await expect(
			service.authenticationVerify(
				'challenge-1',
				{ id: 'cred-1' },
				{ ip: '127.0.0.1' },
			),
		).rejects.toThrow('Passkey authentication failed');
		expect(audit.log).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'PASSKEY_FAILURE',
				resource: 'passkey',
				after: {
					reason: 'assertion_signature_failure',
					type: 'authentication',
				},
			}),
		);
		expect(JSON.stringify(audit.log.mock.calls[0])).not.toContain('cred-1');
	});
	it('audits session issuance failure and rethrows original error', async () => {
		configure();
		const { service, prisma, audit, tenantAuth } = base();
		const issuanceError = new Error('session issuance failed');
		prisma.passkey.findUnique.mockResolvedValue({
			id: 'pk',
			userId: 'u1',
			credentialId: 'cred-1',
			publicKey: new Uint8Array([1]),
			signCount: 0,
			version: 2,
			transports: [],
			revokedAt: null,
			user: { id: 'u1', tenantId: 't1', status: 'ACTIVE', deletedAt: null },
		});
		prisma.passkey.updateMany.mockResolvedValue({ count: 1 });
		webauthn.verifyAuthenticationResponse.mockResolvedValue({
			verified: true,
			authenticationInfo: { newCounter: 1 },
		});
		tenantAuth.createSessionForUser.mockRejectedValue(issuanceError);
		await expect(
			service.authenticationVerify(
				'challenge-1',
				{ id: 'cred-1' },
				{ ip: '127.0.0.1' },
			),
		).rejects.toBe(issuanceError);
		expect(audit.log).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'PASSKEY_FAILURE',
				after: { reason: 'session_issuance_failure', type: 'authentication' },
			}),
		);
	});
	it('uses atomic compare-and-set and audits concurrent assertion', async () => {
		configure();
		const { service, prisma, audit, tenantAuth } = base();
		prisma.passkey.findUnique.mockResolvedValue({
			id: 'pk',
			userId: 'u1',
			credentialId: 'cred-1',
			publicKey: new Uint8Array([1]),
			signCount: 0,
			version: 2,
			transports: [],
			revokedAt: null,
			user: { id: 'u1', tenantId: 't1', status: 'ACTIVE', deletedAt: null },
		});
		prisma.passkey.updateMany.mockResolvedValue({ count: 0 });
		webauthn.verifyAuthenticationResponse.mockResolvedValue({
			verified: true,
			authenticationInfo: { newCounter: 0 },
		});
		await expect(
			service.authenticationVerify('challenge-1', { id: 'cred-1' }),
		).rejects.toThrow('Passkey authentication failed');
		expect(prisma.passkey.updateMany).toHaveBeenCalledWith(
			expect.objectContaining({
				where: expect.objectContaining({ signCount: 0, version: 2 }),
				data: expect.objectContaining({ version: { increment: 1 } }),
			}),
		);
		expect(audit.log).toHaveBeenCalledWith(
			expect.objectContaining({
				after: { reason: 'concurrent_assertion', type: 'authentication' },
			}),
		);
		expect(tenantAuth.createSessionForUser).not.toHaveBeenCalled();
	});
});
