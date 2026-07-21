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
	Min,
	ValidateNested,
} from 'class-validator';
export enum PurchasePaymentMethod {
	CASH = 'CASH',
	BANK_TRANSFER = 'BANK_TRANSFER',
	QR = 'QR',
	DEBT = 'DEBT',
}
export enum PurchaseCreateStatus {
	DRAFT = 'DRAFT',
	COMPLETED = 'COMPLETED',
}
export class CreatePurchaseLineDto {
	@IsUUID('4') productId!: string;
	@IsUUID('4') unitId!: string;
	@IsDecimal({ decimal_digits: '0,6' }) qty!: string;
	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	unitPrice!: number;
	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	lineDiscount = 0;
	@IsOptional() @IsString() batchCode?: string;
	@IsOptional() @IsString() expiresAt?: string;
}
export class CreatePurchaseDto {
	@IsUUID('4') idempotencyKey!: string;
	@IsUUID('4') supplierId!: string;
	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => CreatePurchaseLineDto)
	lines!: CreatePurchaseLineDto[];
	@IsEnum(PurchaseCreateStatus) status = PurchaseCreateStatus.DRAFT;
	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	discountAmount = 0;
	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	shippingFee = 0;
	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	amountPaid = 0;
	@IsEnum(PurchasePaymentMethod) paymentMethod!: PurchasePaymentMethod;
	@IsOptional() @IsString() note?: string;
}
export type PurchaseApiErrorReason =
	| 'VALIDATION_ERROR'
	| 'INVALID_SUPPLIER'
	| 'INVALID_PRODUCT'
	| 'INVALID_CONVERSION'
	| 'INVALID_STATE'
	| 'IDEMPOTENCY_CONFLICT'
	| 'WAREHOUSE_CONFIGURATION_ERROR';
export type PurchaseApiErrorBody = {
	reason: PurchaseApiErrorReason;
	message: string;
	field?: string;
};
