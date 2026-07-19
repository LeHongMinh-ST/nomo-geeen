import { Exclude, Expose, Transform } from 'class-transformer';
import {
	IsEmail,
	IsOptional,
	IsString,
	Length,
	Matches,
	MaxLength,
} from 'class-validator';
import { sanitize } from './create-tenant-user.dto';

/**
 * PATCH /admin/tenants/:tenantId/users/:userId body. Strict field whitelist:
 * only `fullName/username/phone/email` are `@Expose()`d. Any other field
 * (`tenantId`/`status`/`roleId`/`roleCode`/`passwordHash`) is rejected 400 by
 * the global `forbidNonWhitelisted` pipe before the handler runs; the service
 * re-applies the allowlist as defense-in-depth. Role change is a separate
 * endpoint.
 */
@Exclude()
export class UpdateTenantUserDto {
	@Expose()
	@IsOptional()
	@Transform(({ value }) => sanitize(value))
	@IsString()
	@Length(1, 200)
	fullName?: string;

	@Expose()
	@IsOptional()
	@Transform(({ value }) => sanitize(value))
	@IsString()
	@Length(1, 64)
	@Matches(/^\S+$/, { message: 'username must not contain whitespace' })
	username?: string;

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
}
