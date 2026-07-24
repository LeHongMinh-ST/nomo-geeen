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

export class PartialPurchaseReturnLineDto {
	@IsUUID('4')
	purchaseLineId!: string;

	@IsOptional()
	@IsUUID('4')
	batchId?: string;

	@IsDecimal({ decimal_digits: '0,6' })
	qtyBase!: string;
}

export class CreatePartialPurchaseReturnDto {
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

	@IsOptional()
	@IsString()
	@MaxLength(40)
	debtAdjust?: string;

	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => PartialPurchaseReturnLineDto)
	lines!: PartialPurchaseReturnLineDto[];
}
