import { Exclude, Expose, Transform, Type } from 'class-transformer';
import {
	IsBoolean,
	IsDefined,
	IsEmail,
	IsEnum,
	IsInt,
	IsObject,
	IsOptional,
	IsString,
	Length,
	Matches,
	Max,
	MaxLength,
	Min,
	ValidateIf,
	ValidateNested,
} from 'class-validator';
import { TenantType } from '@prisma/client';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PASSWORD_PATTERN =
	/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{12,}$/;
const PRIVATE_HOST =
	/^(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|\[::1\])$/i;
// Match C0 controls (incl. CR/LF/tab) + DEL, built via unicode escapes so the
// source file stays free of raw control bytes.
const CONTROL_CHARS = new RegExp("[\u0000-\u001F\u007F]", "g");

/** Strip control chars / CRLF, trim surrounding whitespace. */
function sanitize(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	return value.replace(CONTROL_CHARS, '').trim();
}

@Exclude()
class CreateTenantTenantDto {
	@Expose()
	@Transform(({ value }) => sanitize(value))
	@IsString()
	@Length(1, 200)
	name!: string;

	@Expose()
	@Transform(({ value }) =>
		typeof value === 'string' ? value.trim().toLowerCase() : value,
	)
	@IsString()
	@Length(3, 63)
	@Matches(SLUG_PATTERN, {
		message:
			'slug must be lowercase alphanumeric words separated by single hyphens',
	})
	slug!: string;

	@Expose()
	@IsEnum(TenantType)
	tenantType!: TenantType;

	@Expose()
	@IsOptional()
	@ValidateIf((_, v) => v !== null && v !== undefined)
	@IsString()
	@MaxLength(2048)
	@Matches(/^https:\/\//i, { message: 'logoUrl must be an HTTPS URL' })
	@Transform(({ value }) => {
		if (value === null || value === undefined || value === '') return value;
		if (typeof value !== 'string') return value;
		try {
			const u = new URL(value);
			if (u.protocol !== 'https:') return value;
			if (PRIVATE_HOST.test(u.hostname)) return '__PRIVATE_HOST__';
			return value;
		} catch {
			return value;
		}
	})
	logoUrl?: string | null;

	@Expose()
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(999)
	seatBonus?: number;
}

@Exclude()
class CreateTenantOwnerDto {
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
	// Exactly-one is enforced in the service (400 PASSWORD_MODE_INVALID); here we
	// only constrain type/format when a field is present.
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

/**
 * POST /admin/tenants body. Nested tenant + owner per the CreateTenantRequest
 * contract (design.md). `mode` is derived server-side, never taken from client.
 */
@Exclude()
export class CreateTenantDto {
	@Expose()
	@IsDefined()
	@IsObject()
	@ValidateNested()
	@Type(() => CreateTenantTenantDto)
	tenant!: CreateTenantTenantDto;

	@Expose()
	@IsDefined()
	@IsObject()
	@ValidateNested()
	@Type(() => CreateTenantOwnerDto)
	owner!: CreateTenantOwnerDto;
}
