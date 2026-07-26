import { AreaUnit } from '@prisma/client';
import { Type } from 'class-transformer';
import {
	ArrayMaxSize,
	IsArray,
	IsBoolean,
	IsEnum,
	IsNotEmpty,
	IsNumber,
	IsOptional,
	IsPositive,
	IsString,
	IsUUID,
	Max,
	ValidateNested,
} from 'class-validator';

/** One drug line: either a concrete product or a free-form active ingredient. */
export class ProtocolItemInputDto {
	@IsOptional()
	@IsUUID('4')
	productId?: string;

	@IsOptional()
	@IsString()
	activeIngredient?: string;

	@Type(() => Number)
	@IsNumber()
	@IsPositive()
	doseAmount!: number;

	@IsString()
	@IsNotEmpty()
	doseUnit!: string;

	@Type(() => Number)
	@IsNumber()
	@IsPositive()
	perAreaAmount!: number;

	@IsEnum(AreaUnit)
	perAreaUnit!: AreaUnit;

	@IsOptional()
	@IsString()
	mixing?: string;

	@IsOptional()
	@IsString()
	usage?: string;
}

export class ProtocolInputDto {
	@IsString()
	@IsNotEmpty()
	name!: string;

	@IsOptional()
	@IsString()
	note?: string;

	@IsOptional()
	@IsBoolean()
	isDefault?: boolean;

	@IsOptional()
	@IsBoolean()
	isActive?: boolean;

	@IsArray()
	@ArrayMaxSize(30)
	@ValidateNested({ each: true })
	@Type(() => ProtocolItemInputDto)
	items!: ProtocolItemInputDto[];
}

/** Replace-all payload for PUT /tenant/handbook/:id/protocols. */
export class ReplaceProtocolsDto {
	@IsArray()
	@ArrayMaxSize(20)
	@ValidateNested({ each: true })
	@Type(() => ProtocolInputDto)
	protocols!: ProtocolInputDto[];
}

/** Optional area context for GET /tenant/handbook/:id/quick-suggestions. */
export class QuickSuggestionsQueryDto {
	@IsOptional()
	@Type(() => Number)
	@IsNumber()
	@IsPositive()
	@Max(1_000_000_000)
	areaValue?: number;

	@IsOptional()
	@IsEnum(AreaUnit)
	areaUnit?: AreaUnit;
}
