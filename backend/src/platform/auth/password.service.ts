import { randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

// Bộ ký tự cho mật khẩu sinh tự động. Bỏ ký tự dễ nhầm (0/O, 1/l/I) để đọc/đọc thành tiếng an toàn.
const GEN_LOWER = 'abcdefghijkmnpqrstuvwxyz';
const GEN_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const GEN_DIGIT = '23456789';
const GEN_SYMBOL = '!@#$%^&*()-_=+';
const GEN_ALL = GEN_LOWER + GEN_UPPER + GEN_DIGIT + GEN_SYMBOL;
const GEN_LENGTH = 16;

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

	/**
	 * Sinh mật khẩu ngẫu nhiên mạnh (crypto RNG) cho luồng cấp tài khoản chủ
	 * cửa hàng khi admin chọn `generatePassword`. Đảm bảo ≥12 ký tự, có đủ
	 * chữ thường/hoa/số/ký tự đặc biệt để vượt policy đăng nhập tenant.
	 * Plaintext chỉ trả về một lần cho caller; không log, không lưu.
	 */
	generate(): string {
		// Bảo đảm mỗi nhóm ký tự xuất hiện ít nhất một lần.
		const required = [
			GEN_LOWER[randomInt(GEN_LOWER.length)],
			GEN_UPPER[randomInt(GEN_UPPER.length)],
			GEN_DIGIT[randomInt(GEN_DIGIT.length)],
			GEN_SYMBOL[randomInt(GEN_SYMBOL.length)],
		];
		const rest = Array.from(
			{ length: GEN_LENGTH - required.length },
			() => GEN_ALL[randomInt(GEN_ALL.length)],
		);
		const chars = [...required, ...rest];
		// Fisher–Yates với crypto RNG để vị trí nhóm bắt buộc không lộ.
		for (let i = chars.length - 1; i > 0; i--) {
			const j = randomInt(i + 1);
			[chars[i], chars[j]] = [chars[j], chars[i]];
		}
		return chars.join('');
	}
}
