import { Exclude, Expose, Transform } from 'class-transformer';
import {
	IsBoolean,
	IsEmail,
	IsIn,
	IsOptional,
	IsString,
	Length,
	Matches,
	MaxLength,
} from 'class-validator';

export const TENANT_ROLE_CODES = ['OWNER', 'MANAGER', 'STAFF'] as const;
export type TenantRoleCode = (typeof TENANT_ROLE_CODES)[number];

const PASSWORD_PATTERN =
	/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/;
// Match C0 controls (incl. CR/LF/tab) + DEL, built via unicode escapes so the
// source file stays free of raw control bytes.
const CONTROL_CHARS = new RegExp("[\u0000-\u001F\u007F]", "g");

/** Strip control chars / CRLF, trim surrounding whitespace. */
export function sanitize(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	return value.replace(CONTROL_CHARS, '').trim();
}

/**
 * POST /admin/tenants/:tenantId/users body. Owner-parity validation: required
 * username, password discriminated union (`{password}` XOR
 * `{generatePassword:true}`, enforced 400 `PASSWORD_MODE_INVALID` in service),
 * role within OWNER/MANAGER/STAFF. `@Exclude()` whitelists fields against mass
 * assignment (no `tenantId`/`status`/`roleId` can sneak in).
 */
@Exclude()
export class CreateTenantUserDto {
	@Expose()
	@Transform(({ value }) => sanitize(value))
	@IsString()
	@Length(1, 200)
	fullName!: string;

	@Expose()
	@Transform(({ value }) => sanitize(value))
	@IsString()
	@Length(1, 64)
	@Matches(/^\S+$/, { message: 'username must not contain whitespace' })
	username!: string;

	@Expose()
	@IsIn(TENANT_ROLE_CODES)
	roleCode!: TenantRoleCode;

	@Expose()
	@IsOptional()
	@Transform(({ value }) => sanitize(value))
	@IsString()
	@MaxLength(32)
	phone?: string;

	@Expose()
	@IsOptional()
	@Transform(({ value }) => sanitize(value))
	@IsEmail()
	@MaxLength(320)
	email?: string;

	@Expose()
	@IsOptional()
	@IsBoolean()
	mustChangePassword?: boolean;

	// Discriminated union: exactly ONE of {password} | {generatePassword:true}.
	// Exactly-one enforced in the service (400 PASSWORD_MODE_INVALID).
	@Expose()
	@IsOptional()
	@IsString()
	@Length(12, 128)
	@Matches(PASSWORD_PATTERN, {
		message:
			'password must be ≥12 chars and include letter, digit, and special character',
	})
	password?: string;

	@Expose()
	@IsOptional()
	@IsBoolean()
	generatePassword?: boolean;
}
