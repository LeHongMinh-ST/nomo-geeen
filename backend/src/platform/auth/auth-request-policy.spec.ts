import { ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthRequestPolicy } from './auth-request-policy';

describe('AuthRequestPolicy', () => {
	const request = (headers: Record<string, string>): Request =>
		({
			get: (name: string) => headers[name.toLowerCase()],
		}) as unknown as Request;

	afterEach(() => {
		delete process.env.CORS_ORIGIN;
	});

	it('accepts a configured origin and normalizes a trailing slash', () => {
		process.env.CORS_ORIGIN = 'http://localhost:3000/';
		expect(() =>
			new AuthRequestPolicy().assertAllowedCookieOrigin(
				request({ origin: 'http://localhost:3000' }),
			),
		).not.toThrow();
	});

	it('derives and validates the origin from a same-site referer', () => {
		process.env.CORS_ORIGIN = 'http://localhost:3000';
		expect(() =>
			new AuthRequestPolicy().assertAllowedCookieOrigin(
				request({ referer: 'http://localhost:3000/dang-nhap' }),
			),
		).not.toThrow();
	});

	it('rejects missing or untrusted origins when configured', () => {
		process.env.CORS_ORIGIN = 'http://localhost:3000';
		expect(() =>
			new AuthRequestPolicy().assertAllowedCookieOrigin(request({})),
		).toThrow(ForbiddenException);
		expect(() =>
			new AuthRequestPolicy().assertAllowedCookieOrigin(
				request({ origin: 'https://attacker.example' }),
			),
		).toThrow(ForbiddenException);
	});

	it('requires exactly one refresh realm cookie', () => {
		const policy = new AuthRequestPolicy();
		expect(policy.assertSingleRefreshRealm({ nomo_user_rt: 'u' })).toBe(
			'tenant',
		);
		expect(policy.assertSingleRefreshRealm({ nomo_admin_rt: 'a' })).toBe(
			'admin',
		);
		expect(() => policy.assertSingleRefreshRealm(undefined)).toThrow(
			ForbiddenException,
		);
		expect(() =>
			policy.assertSingleRefreshRealm({
				nomo_admin_rt: 'a',
				nomo_user_rt: 'u',
			}),
		).toThrow(ForbiddenException);
	});
});
