import { Type } from 'class-transformer';
import {
	ArrayMinSize,
	IsArray,
	IsEnum,
	IsInt,
	IsOptional,
	IsUUID,
	Max,
	Min,
	ValidateNested,
} from 'class-validator';

export enum QuickSalePaymentMethod {
	CASH = 'CASH',
	TRANSFER = 'TRANSFER',
	QR = 'QR',
	DEBT = 'DEBT',
}

export class CreateQuickSaleLineDto {
	@IsUUID('4')
	productId!: string;

	@IsUUID('4')
	unitId!: string;

	@Type(() => Number)
	@IsInt()
	@Min(1)
	@Max(Number.MAX_SAFE_INTEGER)
	qty!: number;

	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	unitPrice!: number;
}

export class CreateQuickSaleDto {
	@IsUUID('4')
	idempotencyKey!: string;

	@IsOptional()
	@IsUUID('4')
	customerId?: string;

	@IsEnum(QuickSalePaymentMethod)
	paymentMethod!: QuickSalePaymentMethod;

	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	amountPaid!: number;

	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	discountAmount = 0;

	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => CreateQuickSaleLineDto)
	lines!: CreateQuickSaleLineDto[];
}

export type QuickSaleApiErrorReason =
	| 'INSUFFICIENT_STOCK'
	| 'PRODUCT_UNSELLABLE'
	| 'PRODUCT_LOCKED'
	| 'PRODUCT_RECALLED'
	| 'PRODUCT_INACTIVE'
	| 'INVALID_CUSTOMER'
	| 'IDEMPOTENCY_CONFLICT'
	| 'VALIDATION_ERROR';

export type QuickSaleApiErrorBody = {
	reason: QuickSaleApiErrorReason;
	message: string;
};
