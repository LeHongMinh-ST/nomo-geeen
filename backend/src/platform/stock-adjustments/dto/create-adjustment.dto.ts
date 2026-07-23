import { Type } from 'class-transformer';
import {
	ArrayMinSize,
	IsArray,
	IsOptional,
	IsString,
	IsUUID,
	Matches,
	MaxLength,
	ValidateNested,
} from 'class-validator';

export class CreateAdjustmentLineDto {
	@IsUUID('4')
	productId!: string;

	/** Signed base-unit delta; non-zero decimal string. */
	@Matches(/^-?(?:[1-9]\d{0,11}(?:\.\d{1,6})?|0\.(?=\d{1,6}$)\d*[1-9]\d*)$/)
	delta!: string;

	@IsString()
	@MaxLength(64)
	reasonCode!: string;

	@IsOptional()
	@IsUUID('4')
	batchId?: string;
}

export class CreateAdjustmentDto {
	@IsUUID('4')
	warehouseId!: string;

	@IsArray()
	@ArrayMinSize(1)
	@ValidateNested({ each: true })
	@Type(() => CreateAdjustmentLineDto)
	lines!: CreateAdjustmentLineDto[];

	@IsOptional()
	@IsString()
	@MaxLength(500)
	note?: string;
}
