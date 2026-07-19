import { Exclude, Expose, Transform } from 'class-transformer';
import {
	IsDateString,
	IsEnum,
	IsOptional,
	IsString,
	IsUrl,
	Length,
	MaxLength,
	ValidateIf,
} from 'class-validator';
import { TenantMode, TenantType } from '@prisma/client';

const PRIVATE_HOST =
	/^(localhost|127\.0\.0\.1|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|\[::1\])$/i;

/**
 * PATCH /admin/tenants/:id body.
 * Whitelist only; expectedUpdatedAt required for optimistic concurrency.
 * logoUrl: HTTPS only (or null), max 2048, no private hosts.
 */
@Exclude()
export class UpdateTenantDto {
	@Expose()
	@IsOptional()
	@IsString()
	@Length(1, 200)
	name?: string;

	@Expose()
	@IsOptional()
	@IsEnum(TenantType)
	tenantType?: TenantType;

	@Expose()
	@IsOptional()
	@IsEnum(TenantMode)
	mode?: TenantMode;

	@Expose()
	@IsOptional()
	@ValidateIf((_, v) => v !== null && v !== undefined)
	@IsUrl(
		{ protocols: ['https'], require_protocol: true, require_tld: false },
		{ message: 'logoUrl must be an HTTPS URL' },
	)
	@MaxLength(2048)
	@Transform(({ value }) => {
		if (value === null || value === undefined || value === '') return value;
		if (typeof value !== 'string') return value;
		try {
			const u = new URL(value);
			if (u.protocol !== 'https:') return value;
			if (PRIVATE_HOST.test(u.hostname)) {
				return '__PRIVATE_HOST__';
			}
			return value;
		} catch {
			return value;
		}
	})
	logoUrl?: string | null;

	@Expose()
	@IsDateString()
	expectedUpdatedAt!: string;
}
