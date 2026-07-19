import { BillingCycle } from '@prisma/client';
import { Exclude, Expose, Transform } from 'class-transformer';
import {
	IsDateString,
	IsEnum,
	IsOptional,
	IsString,
	Matches,
	MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
	typeof value === 'string' ? value.trim() : value;

@Exclude()
export class RenewSubscriptionDto {
	@Expose()
	@IsOptional()
	@IsEnum(BillingCycle)
	billingCycle?: BillingCycle;

	@Expose()
	@IsOptional()
	@IsString()
	@MaxLength(200)
	@Matches(/^[^\r\n]*$/u)
	@Transform(trim)
	manualReference?: string | null;

	@Expose()
	@IsOptional()
	@IsString()
	@MaxLength(500)
	@Matches(/^[^\r\n]*$/u)
	@Transform(trim)
	reason?: string | null;

	@Expose()
	@IsDateString()
	expectedUpdatedAt!: string;
}
