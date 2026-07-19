import { BillingCycle, SubscriptionStatus } from '@prisma/client';
import { Exclude, Expose, Transform } from 'class-transformer';
import {
	IsDateString,
	IsEnum,
	IsOptional,
	IsString,
	IsUUID,
	Matches,
	MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
	typeof value === 'string' ? value.trim() : value;

@Exclude()
export class CreateSubscriptionDto {
	@Expose()
	@IsString()
	@IsUUID('4')
	planId!: string;

	@Expose()
	@IsEnum(SubscriptionStatus)
	@Matches(/^(ACTIVE|TRIALING)$/u)
	status!: 'ACTIVE' | 'TRIALING';

	@Expose()
	@IsEnum(BillingCycle)
	billingCycle!: BillingCycle;

	@Expose()
	@IsDateString()
	startDate!: string;

	@Expose()
	@IsOptional()
	@IsDateString()
	endDate?: string | null;

	@Expose()
	@IsOptional()
	@IsDateString()
	trialEndsAt?: string | null;

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
	@IsOptional()
	@IsDateString()
	expectedUpdatedAt?: string | null;
}
