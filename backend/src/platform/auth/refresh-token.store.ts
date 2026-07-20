import { createHash } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

export type RotateResult = 'ok' | 'reuse' | 'missing';

export function sha256(value: string): string {
	return createHash('sha256').update(value).digest('hex');
}

export function rtKey(familyId: string): string {
	return `admin:rt:${familyId}`;
}

export function rtPrevKey(familyId: string): string {
	return `admin:rt:${familyId}:prev`;
}

export function blKey(token: string): string {
	return `admin:bl:${sha256(token)}`;
}

/**
 * F-09/F-18: per-admin SET index mapping adminId -> open refresh familyIds.
 * Lets `revokeAllForAdmin(adminId)` wipe all sessions for an admin in O(families)
 * without SCAN-ing the global `admin:rt:*` keyspace.
 */
export function rtIdxKey(adminId: string): string {
	return `admin:rtidx:${adminId}`;
}

export function userRtKey(familyId: string): string {
	return `user:rt:${familyId}`;
}

export function userRtPrevKey(familyId: string): string {
	return `user:rt:${familyId}:prev`;
}

export function userBlKey(token: string): string {
	return `user:bl:${sha256(token)}`;
}

export function userRtIdxKey(userId: string): string {
	return `user:rtidx:${userId}`;
}

export function userLoginAttemptKey(
	tenantId: string,
	identifier: string,
): string {
	return `user:login-attempt:${sha256(`${tenantId}:${identifier.trim().toLowerCase()}`)}`;
}

/**
 * TTL con lai (giay) tu JWT exp (epoch giay), floor toi thieu 1s.
 */
export function remainingTtlSec(expEpochSec: number): number {
	return Math.max(1, Math.floor(expEpochSec - Date.now() / 1000));
}

/**
 * Lua CAS atomic cho rotation. Mot lan eval:
 * KEYS[1]=current family, KEYS[2]=:prev
 * ARGV[1]=sha256(old), ARGV[2]=sha256(new), ARGV[3]=ttlSec, ARGV[4]=graceSec
 * - current khong ton tai            -> 'missing'
 * - sha(old) == current              -> set current=new(ttl), prev=current cu(grace) -> 'ok'
 * - sha(old) == prev (grace window)  -> 'ok' (idempotent, khong xoa)
 * - nguoc lai (reuse ngoai grace)    -> DEL current+prev -> 'reuse'
 */
const ROTATE_LUA = `
local cur = redis.call('GET', KEYS[1])
if not cur then return 'missing' end
local ttl = math.max(1, tonumber(ARGV[3]))
local grace = math.max(1, tonumber(ARGV[4]))
if cur == ARGV[1] then
  redis.call('SET', KEYS[2], cur, 'EX', grace)
  redis.call('SET', KEYS[1], ARGV[2], 'EX', ttl)
  return 'ok'
end
local prev = redis.call('GET', KEYS[2])
if prev and prev == ARGV[1] then
  return 'ok'
end
redis.call('DEL', KEYS[1])
redis.call('DEL', KEYS[2])
return 'reuse'
`;

const LOGIN_ATTEMPT_LUA = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
return count
`;

/**
 * Owner duy nhat cua refresh-family + access blacklist trong Redis (R3).
 * Chi luu sha256(token), khong bao gio luu token tho (R8.3). Moi key deu co TTL.
 *
 * Per-admin SET index (F-09/F-18) lets `revokeAllForAdmin` wipe all sessions
 * for an admin without scanning the global keyspace.
 */
@Injectable()
export class RefreshTokenStore {
	constructor(private readonly redis: RedisService) {}

	async open(
		familyId: string,
		refreshToken: string,
		ttlSec: number,
		adminId?: string,
	): Promise<void> {
		await this.redis.set(rtKey(familyId), sha256(refreshToken), ttlSec);
		if (adminId) {
			await this.redis.sadd(rtIdxKey(adminId), familyId);
		}
	}

	async rotate(
		familyId: string,
		oldToken: string,
		newToken: string,
		ttlSec: number,
		graceSec: number,
	): Promise<RotateResult> {
		// Rotation keeps the family on the same adminId, so the SET index is
		// untouched (adminId never changes during rotation).
		const result = await this.redis.eval(
			ROTATE_LUA,
			2,
			rtKey(familyId),
			rtPrevKey(familyId),
			sha256(oldToken),
			sha256(newToken),
			ttlSec,
			graceSec,
		);
		return result as RotateResult;
	}

	async revokeFamily(familyId: string, adminId?: string): Promise<void> {
		await this.redis.del(rtKey(familyId), rtPrevKey(familyId));
		if (adminId) {
			await this.redis.srem(rtIdxKey(adminId), familyId);
		}
	}

	async blacklistAccess(token: string, ttlSec: number): Promise<void> {
		await this.redis.set(blKey(token), '1', ttlSec);
	}

	async isAccessBlacklisted(token: string): Promise<boolean> {
		return (await this.redis.get(blKey(token))) !== null;
	}

	/**
	 * F-09/F-18: revoke every refresh family for an admin (R3.7.a reset-password
	 * path). Uses the per-admin SET index to avoid SCAN over `admin:rt:*`.
	 */
	async revokeAllForAdmin(adminId: string): Promise<void> {
		const familyIds = await this.redis.smembers(rtIdxKey(adminId));
		if (familyIds.length === 0) {
			return;
		}
		const allKeys = familyIds.flatMap((fid) => [rtKey(fid), rtPrevKey(fid)]);
		await this.redis.del(...allKeys);
		await this.redis.del(rtIdxKey(adminId));
	}

	async openUser(
		familyId: string,
		refreshToken: string,
		ttlSec: number,
		userId?: string,
	): Promise<void> {
		await this.redis.set(userRtKey(familyId), sha256(refreshToken), ttlSec);
		if (userId) await this.redis.sadd(userRtIdxKey(userId), familyId);
	}

	async rotateUser(
		familyId: string,
		oldToken: string,
		newToken: string,
		ttlSec: number,
		graceSec: number,
	): Promise<RotateResult> {
		const result = await this.redis.eval(
			ROTATE_LUA,
			2,
			userRtKey(familyId),
			userRtPrevKey(familyId),
			sha256(oldToken),
			sha256(newToken),
			ttlSec,
			graceSec,
		);
		return result as RotateResult;
	}

	async revokeUserFamily(familyId: string, userId?: string): Promise<void> {
		await this.redis.del(userRtKey(familyId), userRtPrevKey(familyId));
		if (userId) await this.redis.srem(userRtIdxKey(userId), familyId);
	}

	async blacklistUserAccess(token: string, ttlSec: number): Promise<void> {
		await this.redis.set(userBlKey(token), '1', ttlSec);
	}

	async isUserAccessBlacklisted(token: string): Promise<boolean> {
		return (await this.redis.get(userBlKey(token))) !== null;
	}

	async revokeAllForUser(userId: string): Promise<void> {
		const familyIds = await this.redis.smembers(userRtIdxKey(userId));
		if (familyIds.length === 0) return;
		await this.redis.del(
			...familyIds.flatMap((fid) => [userRtKey(fid), userRtPrevKey(fid)]),
		);
		await this.redis.del(userRtIdxKey(userId));
	}

	async revokeOtherUserFamilies(
		userId: string,
		keepFamilyId: string,
	): Promise<void> {
		const familyIds = await this.redis.smembers(userRtIdxKey(userId));
		const otherFamilyIds = familyIds.filter(
			(familyId) => familyId !== keepFamilyId,
		);
		if (otherFamilyIds.length === 0) return;
		await this.redis.del(
			...otherFamilyIds.flatMap((familyId) => [
				userRtKey(familyId),
				userRtPrevKey(familyId),
			]),
		);
		await Promise.all(
			otherFamilyIds.map((familyId) =>
				this.redis.srem(userRtIdxKey(userId), familyId),
			),
		);
	}

	async recordUserLoginFailure(
		tenantId: string,
		identifier: string,
		windowSec = Number(process.env.USER_LOGIN_WINDOW_SEC ?? 900),
	): Promise<number> {
		const count = await this.redis.eval(
			LOGIN_ATTEMPT_LUA,
			1,
			userLoginAttemptKey(tenantId, identifier),
			Math.max(1, windowSec),
		);
		return Number(count);
	}

	async clearUserLoginFailures(
		tenantId: string,
		identifier: string,
	): Promise<void> {
		await this.redis.del(userLoginAttemptKey(tenantId, identifier));
	}
}
