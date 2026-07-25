import { Type } from 'class-transformer';
import {
	ArrayMinSize,
	IsArray,
	IsDecimal,
	IsIn,
	IsOptional,
	IsString,
	IsUUID,
	MaxLength,
	ValidateNested,
} from 'class-validator';

export class PartialSalesReturnLineDto {
	@IsUUID('4')
	saleLineId!: string;

	@IsOptional()
	@IsUUID('4')
	batchId?: string;

	@IsDecimal({ decimal_digits: '0,6' })
	qtyBase!: string;
}

export class CreatePartialSalesReturnDto {
	@IsOptional()
	@IsString()
	@MaxLength(100)
	idempotencyKey?: string;

	@IsOptional()
	@IsString()
	@MaxLength(500)
	note?: string;

	@IsOptional()
	@IsIn(['DEBT_ADJUST_ONLY', 'NONE', 'REFUND_VOUCHER'])
	settlementMode?: 'DEBT_ADJUST_ONLY' | 'NONE' | 'REFUND_VOUCHER';

	/** BigInt money as decimal string of integer minor units. */
	@IsOptional()
	@IsString()
	@MaxLength(40)
	debtAdjust?: string;

	/** BigInt money as decimal string of integer minor units. */
	@IsOptional()
	@IsString()
	@MaxLength(40)
	refundAmount?: string;

	@IsOptional()
	@IsIn(['CASH', 'BANK_TRANSFER', 'QR'])
	refundMethod?: 'CASH' | 'BANK_TRANSFER' | 'QR';

	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => PartialSalesReturnLineDto)
	lines!: PartialSalesReturnLineDto[];
}
