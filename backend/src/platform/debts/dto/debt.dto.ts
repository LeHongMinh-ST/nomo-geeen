import { Type } from 'class-transformer';
import {
	IsEnum,
	IsInt,
	IsISO8601,
	IsOptional,
	IsString,
	IsUUID,
	Max,
	Min,
} from 'class-validator';

export enum DebtPartyTypeInput {
	CUSTOMER = 'CUSTOMER',
	SUPPLIER = 'SUPPLIER',
}
export enum DebtStatusInput {
	ALL = 'ALL',
	OWING = 'OWING',
	PAID = 'PAID',
}
export enum VoucherTypeInput {
	RECEIPT = 'RECEIPT',
	PAYMENT = 'PAYMENT',
}
export enum PaymentMethodInput {
	CASH = 'CASH',
	BANK_TRANSFER = 'BANK_TRANSFER',
	QR = 'QR',
}

export class DebtQueryDto {
	@IsOptional() @IsEnum(DebtPartyTypeInput) partyType?: DebtPartyTypeInput;
	@IsOptional() @IsString() search?: string;
	@IsOptional() @IsEnum(DebtStatusInput) status: DebtStatusInput =
		DebtStatusInput.OWING;
	@IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
	@IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20) pageSize = 20;
}
export class CreateDebtVoucherDto {
	@IsUUID() idempotencyKey!: string;
	@IsEnum(VoucherTypeInput) voucherType!: VoucherTypeInput;
	@IsEnum(DebtPartyTypeInput) partyType!: DebtPartyTypeInput;
	@IsString() partyId!: string;
	@IsInt() @Min(1) amount!: number;
	@IsEnum(PaymentMethodInput) method!: PaymentMethodInput;
	@IsOptional() @IsISO8601() occurredAt?: string;
	@IsOptional() @IsString() note?: string;
}
