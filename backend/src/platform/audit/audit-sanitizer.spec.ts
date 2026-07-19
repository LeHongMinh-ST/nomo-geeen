import { sanitizeAuditValue } from './audit-sanitizer';

describe('sanitizeAuditValue', () => {
	it('masks sensitive keys recursively and case-insensitively', () => {
		const result = sanitizeAuditValue({
			userId: 'user-1',
			PasswordHash: 'hash-value',
			passwd: 'password-value',
			jwt: 'jwt-value',
			nested: [{ accessToken: 'access-token', profile: { name: 'An' } }],
		});

		expect(result).toEqual({
			userId: 'user-1',
			PasswordHash: '[REDACTED]',
			passwd: '[REDACTED]',
			jwt: '[REDACTED]',
			nested: [{ accessToken: '[REDACTED]', profile: { name: 'An' } }],
		});
	});

	it('preserves nulls, scalars, arrays, and non-sensitive context', () => {
		expect(sanitizeAuditValue(null)).toBeNull();
		expect(sanitizeAuditValue('plain')).toBe('plain');
		expect(sanitizeAuditValue([1, null, { resourceId: 'role-1' }])).toEqual([
			1,
			null,
			{ resourceId: 'role-1' },
		]);
	});
});
