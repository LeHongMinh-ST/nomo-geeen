import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * Tham so Argon2id (OWASP 2024+). parallelism=2 khop min vCPU muc tieu (Phase 1 VPS 2-4 vCPU).
 */
export const ARGON2_OPTS: argon2.Options = {
	type: argon2.argon2id,
	memoryCost: 65536, // 64 MB
	timeCost: 3,
	parallelism: 2,
};

/**
 * Hash Argon2id co dinh dung cho nhanh "user-not-found" o login (R1.2):
 * verify decoy nay de thoi gian phan hoi khong phan biet "khong co admin" vs "sai mat khau".
 * Khong phai mat khau that; khong ai dang nhap bang no.
 */
export const DECOY_HASH =
	'$argon2id$v=19$m=65536,t=3,p=2$RjSTghG/aIE9Gpijh2E/EA$2SNWSiPWrt3xD5E6lPtYMAtwA7LOU5dOrvETsePWcYA';

@Injectable()
export class PasswordService {
	async hash(plain: string): Promise<string> {
		return argon2.hash(plain, ARGON2_OPTS);
	}

	/**
	 * Tra ve boolean; khong bao gio throw ra caller (hash hong -> false).
	 */
	async verify(hash: string, plain: string): Promise<boolean> {
		try {
			return await argon2.verify(hash, plain);
		} catch {
			return false;
		}
	}
}
