import { BusinessGroup, ProductKind } from '@prisma/client';
import { Type } from 'class-transformer';
import {
	IsEnum,
	IsInt,
	IsNotEmpty,
	IsObject,
	IsOptional,
	IsString,
	IsUUID,
	Max,
	Min,
} from 'class-validator';

export class CreateProductDto {
	@IsString()
	@IsNotEmpty()
	sku!: string;

	@IsString()
	@IsNotEmpty()
	name!: string;

	@IsUUID('4')
	baseUnitId!: string;

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
	@IsUUID('4')
	categoryId?: string;

	@IsOptional()
	@IsString()
	barcode?: string;

	@IsOptional()
	@IsUUID('4')
	brandId?: string;

	@IsOptional()
	@IsUUID('4')
	manufacturerId?: string;

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
	@IsObject()
	attrs?: Record<string, unknown>;
}
