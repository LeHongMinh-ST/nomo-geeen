import { DECOY_HASH, PasswordService } from './password.service';

describe('PasswordService', () => {
	const service = new PasswordService();

	it('hash() produces an Argon2id-formatted string', async () => {
		const hash = await service.hash('s3cret-pass');
		expect(hash.startsWith('$argon2id$')).toBe(true);
	});

	it('verify() returns true for the correct password', async () => {
		const hash = await service.hash('s3cret-pass');
		await expect(service.verify(hash, 's3cret-pass')).resolves.toBe(true);
	});

	it('verify() returns false for a wrong password', async () => {
		const hash = await service.hash('s3cret-pass');
		await expect(service.verify(hash, 'wrong-pass')).resolves.toBe(false);
	});

	it('verify() returns false (never throws) for a malformed hash', async () => {
		await expect(service.verify('not-a-hash', 'whatever')).resolves.toBe(false);
	});

	it('two hashes of the same input differ (salted)', async () => {
		const a = await service.hash('same-input');
		const b = await service.hash('same-input');
		expect(a).not.toEqual(b);
	});

	it('DECOY_HASH is a valid Argon2id hash usable for constant-time verify', async () => {
		expect(DECOY_HASH.startsWith('$argon2id$')).toBe(true);
		// verify against decoy must complete and return false for any input
		await expect(service.verify(DECOY_HASH, 'anything')).resolves.toBe(false);
	});
});
