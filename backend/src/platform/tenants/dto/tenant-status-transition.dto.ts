import { Exclude, Expose, Transform } from 'class-transformer';
import {
	IsEnum,
	IsOptional,
	IsString,
	MaxLength,
	ValidateIf,
} from 'class-validator';
import { TenantStatus } from '@prisma/client';

function stripCrlf(value: unknown): unknown {
	if (typeof value !== 'string') return value;
	return value.replace(/[\r\n]+/g, ' ').trim();
}

/**
 * POST /admin/tenants/:id/status body (TenantStatusTransition).
 * reason max 500; CRLF stripped.
 */
@Exclude()
export class TenantStatusTransitionDto {
	@Expose()
	@IsEnum(TenantStatus)
	status!: TenantStatus;

	@Expose()
	@IsOptional()
	@ValidateIf((_, v) => v !== null && v !== undefined)
	@IsString()
	@MaxLength(500)
	@Transform(({ value }) =>
		value === null || value === undefined ? value : stripCrlf(value),
	)
	reason?: string | null;
}
