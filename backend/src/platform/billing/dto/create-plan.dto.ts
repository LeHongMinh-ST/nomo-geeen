import { BillingCycle } from '@prisma/client';
import { Exclude, Expose, Transform, Type } from 'class-transformer';
import {
	ArrayUnique,
	IsArray,
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

/** Shared plan catalog query contract. The service also enforces the cap. */
@Exclude()
export class PlanQueryDto {
	@Expose()
	@Type(() => Number)
	@IsOptional()
	@IsInt()
	@Min(1)
	page = 1;

	@Expose()
	@Type(() => Number)
	@IsOptional()
	@IsInt()
	@Min(1)
	@Max(100)
	pageSize = 20;
}

@Exclude()
export class CreatePlanDto {
	@Expose()
	@IsString()
	@Length(2, 64)
	@Matches(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/, {
		message: 'code must be lowercase kebab/snake/dot notation',
	})
	code!: string;

	@Expose()
	@IsString()
	@Length(1, 200)
	name!: string;

	@Expose()
	@IsOptional()
	@IsString()
	@MaxLength(2000)
	description?: string | null;

	@Expose()
	@Transform(toNumber)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	price!: number;

	@Expose()
	@IsEnum(BillingCycle)
	billingCycle: BillingCycle = BillingCycle.MONTHLY;

	@Expose()
	@Transform(toNumber)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	maxUsers!: number;

	@Expose()
	@Transform(toNumber)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	maxWarehouses!: number;

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
	maxStorageBytes!: number;

	@Expose()
	@IsArray()
	@ArrayUnique()
	@IsString({ each: true })
	@Length(1, 100, { each: true })
	@Matches(/^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/, { each: true })
	@IsOptional()
	featureCodes: string[] = [];
}
