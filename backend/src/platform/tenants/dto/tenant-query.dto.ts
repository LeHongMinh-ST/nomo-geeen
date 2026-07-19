import { Exclude, Expose, Transform, Type } from 'class-transformer';
import {
	IsEnum,
	IsInt,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
} from 'class-validator';
import { TenantStatus } from '@prisma/client';

/**
 * List/export query contract (admin-tenant-management).
 * Defaults: page=1, pageSize=20. Caps: pageSize 1..100, q max 100.
 */
@Exclude()
export class TenantQueryDto {
	@Expose()
	@IsOptional()
	@IsString()
	@MaxLength(100)
	@Transform(({ value }) =>
		typeof value === 'string' ? value.trim() : value,
	)
	q?: string;

	@Expose()
	@IsOptional()
	@IsEnum(TenantStatus)
	status?: TenantStatus;

	@Expose()
	@IsOptional()
	@Type(() => Number)
	@Transform(({ value }) =>
		value === undefined || value === null || value === '' ? 1 : Number(value),
	)
	@IsInt()
	@Min(1)
	page: number = 1;

	@Expose()
	@IsOptional()
	@Type(() => Number)
	@Transform(({ value }) =>
		value === undefined || value === null || value === '' ? 20 : Number(value),
	)
	@IsInt()
	@Min(1)
	@Max(100)
	pageSize: number = 20;
}
