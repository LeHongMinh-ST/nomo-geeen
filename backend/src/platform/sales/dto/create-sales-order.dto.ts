import { Type } from 'class-transformer';
import {
	ArrayMinSize,
	IsArray,
	IsDecimal,
	IsEnum,
	IsInt,
	IsOptional,
	IsString,
	IsUUID,
	Max,
	MaxLength,
	Matches,
	Min,
	ValidateNested,
} from 'class-validator';

export enum SalesOrderCreateStatus {
	DRAFT = 'DRAFT',
	COMPLETED = 'COMPLETED',
}
export enum SalesOrderPaymentMethod {
	CASH = 'CASH',
	BANK_TRANSFER = 'BANK_TRANSFER',
	QR = 'QR',
	DEBT = 'DEBT',
}

export class CreateSalesOrderLineDto {
	@IsUUID('4') productId!: string;
	@IsUUID('4') unitId!: string;
	@IsDecimal({ decimal_digits: '0,6' })
	@Matches(/^(?:[1-9]\d{0,11}(?:\.\d{1,6})?|0\.(?=\d{1,6}$)\d*[1-9]\d*)$/)
	qty!: string;
	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	unitPrice!: number;
}

export class CreateSalesOrderDto {
	@IsUUID('4') idempotencyKey!: string;
	@IsOptional() @IsUUID('4') customerId?: string;
	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => CreateSalesOrderLineDto)
	lines!: CreateSalesOrderLineDto[];
	@IsEnum(SalesOrderCreateStatus) status = SalesOrderCreateStatus.DRAFT;
	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	discountAmount = 0;
	@IsOptional() @IsString() @MaxLength(500) note?: string;
	@IsOptional()
	@IsEnum(SalesOrderPaymentMethod)
	paymentMethod?: SalesOrderPaymentMethod;
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	amountPaid?: number;
}
