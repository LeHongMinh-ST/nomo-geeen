import { BillingCycle } from '@prisma/client';
import { Exclude, Expose, Transform } from 'class-transformer';
import {
	ArrayUnique,
	IsArray,
	IsBoolean,
	IsDateString,
	IsEnum,
	IsInt,
	IsOptional,
	IsString,
	Length,
	Matches,
	Max,
	MaxLength,
	Min,
} from 'class-validator';

const toNumber = ({ value }: { value: unknown }) =>
	value === null || value === undefined || value === '' ? value : Number(value);

@Exclude()
export class UpdatePlanDto {
	@Expose()
	@IsOptional()
	@IsString()
	@Length(1, 200)
	name?: string;

	@Expose()
	@IsOptional()
	@IsString()
	@MaxLength(2000)
	description?: string | null;

	@Expose()
	@IsOptional()
	@Transform(toNumber)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	price?: number;

	@Expose()
	@IsOptional()
	@IsEnum(BillingCycle)
	billingCycle?: BillingCycle;

	@Expose()
	@IsOptional()
	@Transform(toNumber)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	maxUsers?: number;

	@Expose()
	@IsOptional()
	@Transform(toNumber)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	maxWarehouses?: number;

	@Expose()
	@Transform(toNumber)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	@IsOptional()
	maxProducts?: number | null;

	@Expose()
	@Transform(toNumber)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	@IsOptional()
	maxCustomers?: number | null;

	@Expose()
	@Transform(toNumber)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	@IsOptional()
	maxOrdersPerMonth?: number | null;

	@Expose()
	@Transform(toNumber)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	@IsOptional()
	maxStorageBytes?: number;

	@Expose()
	@IsArray()
	@ArrayUnique()
	@IsString({ each: true })
	@Length(1, 100, { each: true })
	@Matches(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/, { each: true })
	@IsOptional()
	featureCodes?: string[];

	@Expose()
	@IsDateString()
	expectedUpdatedAt!: string;
}

@Exclude()
export class PlanActivationDto {
	@Expose()
	@IsBoolean()
	isActive!: boolean;

	@Expose()
	@IsDateString()
	expectedUpdatedAt!: string;
}
