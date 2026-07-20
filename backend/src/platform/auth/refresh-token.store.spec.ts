import { RedisService } from '../redis/redis.service';
import {
	blKey,
	RefreshTokenStore,
	remainingTtlSec,
	rtKey,
	rtPrevKey,
	sha256,
	userBlKey,
	userLoginAttemptKey,
	userRtKey,
	userRtPrevKey,
} from './refresh-token.store';

/**
 * Integration test chay tren Redis that (docker compose redis:6379).
 * Kiem chung Lua CAS atomic + grace window + blacklist.
 */
describe('RefreshTokenStore (real Redis)', () => {
	let redis: RedisService;
	let store: RefreshTokenStore;

	beforeAll(async () => {
		process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
		redis = new RedisService();
		await redis.onModuleInit();
		store = new RefreshTokenStore(redis);
	});

	afterAll(async () => {
		await redis.onModuleDestroy();
	});

	const fam = () => `test-fam-${Math.floor(process.hrtime()[1])}`;

	it('open then rotate(ok) replaces the stored hash', async () => {
		const familyId = fam();
		await store.open(familyId, 't0', 60);
		const r = await store.rotate(familyId, 't0', 't1', 60, 5);
		expect(r).toBe('ok');
		// stored is now sha256('t1'); rotating t0 again is stale but within grace -> ok
		await store.revokeFamily(familyId);
	});

	it('concurrent rotate with the same old token converges via :prev grace', async () => {
		const familyId = fam();
		await store.open(familyId, 'A', 60);
		const first = await store.rotate(familyId, 'A', 'B', 60, 5);
		// second request still presenting old 'A' — should hit :prev grace, not reuse
		const second = await store.rotate(familyId, 'A', 'C', 60, 5);
		expect(first).toBe('ok');
		expect(second).toBe('ok');
		// family must still exist (not deleted)
		expect(await redis.get(rtKey(familyId))).not.toBeNull();
		await store.revokeFamily(familyId);
	});

	it('stale token outside grace -> reuse and family deleted', async () => {
		const familyId = fam();
		await store.open(familyId, 'X', 60);
		await store.rotate(familyId, 'X', 'Y', 60, 5); // now current=Y, prev=X
		await store.rotate(familyId, 'Y', 'Z', 60, 5); // now current=Z, prev=Y (X no longer prev)
		const reuse = await store.rotate(familyId, 'X', 'W', 60, 5); // X is neither current nor prev
		expect(reuse).toBe('reuse');
		expect(await redis.get(rtKey(familyId))).toBeNull();
		expect(await redis.get(rtPrevKey(familyId))).toBeNull();
	});

	it('rotate on unknown family -> missing', async () => {
		const r = await store.rotate('does-not-exist-fam', 'a', 'b', 60, 5);
		expect(r).toBe('missing');
	});

	it('blacklist round-trip true/false with a TTL', async () => {
		const token = `acc-${fam()}`;
		expect(await store.isAccessBlacklisted(token)).toBe(false);
		await store.blacklistAccess(token, 30);
		expect(await store.isAccessBlacklisted(token)).toBe(true);
		expect(await redis.ttl(blKey(token))).toBeGreaterThan(0);
		await redis.del(blKey(token));
	});

	it('open sets a TTL on the family key', async () => {
		const familyId = fam();
		await store.open(familyId, 'ttl-check', 60);
		const ttl = await redis.ttl(rtKey(familyId));
		expect(ttl).toBeGreaterThan(0);
		await store.revokeFamily(familyId);
	});

	it('helpers: sha256 + key formats + remainingTtlSec floor', () => {
		expect(sha256('x')).toHaveLength(64);
		expect(rtKey('f')).toBe('admin:rt:f');
		expect(rtPrevKey('f')).toBe('admin:rt:f:prev');
		expect(blKey('tok')).toBe(`admin:bl:${sha256('tok')}`);
		// expired exp -> floored to 1
		expect(remainingTtlSec(Date.now() / 1000 - 100)).toBe(1);
		expect(userRtKey('f')).toBe('user:rt:f');
		expect(userRtPrevKey('f')).toBe('user:rt:f:prev');
		expect(userBlKey('tok')).toBe(`user:bl:${sha256('tok')}`);
		expect(userLoginAttemptKey('tenant-1', ' Owner ')).toBe(
			userLoginAttemptKey('tenant-1', 'owner'),
		);
	});

	it('user refresh rotation uses only the user namespace', async () => {
		const familyId = fam();
		await store.openUser(familyId, 'u0', 60, 'user-1');
		expect(await redis.get(userRtKey(familyId))).toBe(sha256('u0'));
		expect(await redis.get(rtKey(familyId))).toBeNull();
		expect(await store.rotateUser(familyId, 'u0', 'u1', 60, 5)).toBe('ok');
		expect(await redis.get(userRtPrevKey(familyId))).toBe(sha256('u0'));
		await store.revokeUserFamily(familyId, 'user-1');
	});

	it('user login failure counter is bounded by a Redis TTL', async () => {
		const count = await store.recordUserLoginFailure('tenant-1', 'owner', 60);
		expect(count).toBeGreaterThanOrEqual(1);
		expect(
			await redis.ttl(userLoginAttemptKey('tenant-1', 'owner')),
		).toBeGreaterThan(0);
		await store.clearUserLoginFailures('tenant-1', 'owner');
	});
});
