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

/**
 * Owner duy nhat cua refresh-family + access blacklist trong Redis (R3).
 * Chi luu sha256(token), khong bao gio luu token tho (R8.3). Moi key deu co TTL.
 */
@Injectable()
export class RefreshTokenStore {
	constructor(private readonly redis: RedisService) {}

	async open(
		familyId: string,
		refreshToken: string,
		ttlSec: number,
	): Promise<void> {
		await this.redis.set(rtKey(familyId), sha256(refreshToken), ttlSec);
	}

	async rotate(
		familyId: string,
		oldToken: string,
		newToken: string,
		ttlSec: number,
		graceSec: number,
	): Promise<RotateResult> {
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

	async revokeFamily(familyId: string): Promise<void> {
		await this.redis.del(rtKey(familyId), rtPrevKey(familyId));
	}

	async blacklistAccess(token: string, ttlSec: number): Promise<void> {
		await this.redis.set(blKey(token), '1', ttlSec);
	}

	async isAccessBlacklisted(token: string): Promise<boolean> {
		return (await this.redis.get(blKey(token))) !== null;
	}
}
