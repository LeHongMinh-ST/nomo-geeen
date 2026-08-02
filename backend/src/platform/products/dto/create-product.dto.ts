import { BusinessGroup, ProductKind } from '@prisma/client';
import { Type } from 'class-transformer';
import {
	IsArray,
	IsBoolean,
	IsEnum,
	IsInt,
	IsNotEmpty,
	IsObject,
	IsOptional,
	IsString,
	IsUUID,
	Max,
	MaxLength,
	Min,
	ValidateNested,
} from 'class-validator';
import { ProductConversionDto } from './product-conversion.dto';
export class CreateProductDto {
	@IsOptional()
	@IsString()
	sku?: string;
	@IsString()
	@IsNotEmpty()
	name!: string;
	@IsOptional()
	@IsUUID('4')
	baseUnitId?: string;
	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	costPrice = 0;
	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	salePrice = 0;
	@IsOptional()
	barcode?: string;
	@IsOptional()
	@IsUUID('4')
	brandId?: string;
	@IsOptional()
	@IsUUID('4')
	manufacturerId?: string;
	@IsOptional()
	@IsString()
	brandName?: string;
	@IsOptional()
	@IsString()
	manufacturerName?: string;
	@IsOptional()
	@IsArray()
	@ValidateNested({ each: true })
	@Type(() => ProductConversionDto)
	conversions?: ProductConversionDto[];
	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	wholesalePrice?: number;
	@IsOptional()
	@IsEnum(BusinessGroup)
	businessGroup?: BusinessGroup;
	@IsOptional()
	@IsEnum(ProductKind)
	productKind?: ProductKind;
	@IsOptional()
	@IsBoolean()
	requiresPrescription?: boolean;
	@IsOptional()
	@IsString()
	@MaxLength(120)
	registrationNo?: string;
	@IsOptional()
	@IsObject()
	attrs?: Record<string, unknown>;
}
