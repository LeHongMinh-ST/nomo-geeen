import { AuditAction, AuditActorType } from '@prisma/client';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import {
	IsDateString,
	IsEnum,
	IsInt,
	IsOptional,
	IsString,
	Max,
	MaxLength,
	Min,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
	typeof value === 'string' ? value.trim() : value;

const toPage = ({ value }: { value: unknown }) => {
	if (value === undefined || value === null || value === '') return 1;
	return Number(value);
};

const toPageSize = ({ value }: { value: unknown }) => {
	if (value === undefined || value === null || value === '') return 20;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 100) : value;
};

@Exclude()
export class AuditQueryDto {
	@Expose()
	@IsOptional()
	@Type(() => Number)
	@Transform(toPage)
	@IsInt()
	@Min(1)
	page = 1;

	@Expose()
	@IsOptional()
	@Type(() => Number)
	@Transform(toPageSize)
	@IsInt()
	@Min(1)
	@Max(100)
	pageSize = 20;

	@Expose()
	@IsOptional()
	@IsDateString({ strict: true })
	from?: string;

	@Expose()
	@IsOptional()
	@IsDateString({ strict: true })
	to?: string;

	@Expose()
	@IsOptional()
	@IsEnum(AuditActorType)
	actorType?: AuditActorType;

	@Expose()
	@IsOptional()
	@IsString()
	@MaxLength(100)
	@Transform(trim)
	actorId?: string;

	@Expose()
	@IsOptional()
	@IsString()
	@MaxLength(100)
	@Transform(trim)
	tenantId?: string;

	@Expose()
	@IsOptional()
	@IsEnum(AuditAction)
	action?: AuditAction;

	@Expose()
	@IsOptional()
	@IsString()
	@MaxLength(100)
	@Transform(trim)
	resource?: string;

	@Expose()
	@IsOptional()
	@IsString()
	@MaxLength(100)
	@Transform(trim)
	resourceId?: string;

	@Expose()
	@IsOptional()
	@IsString()
	@MaxLength(100)
	@Transform(trim)
	q?: string;
}
