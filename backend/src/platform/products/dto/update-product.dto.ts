import { BusinessGroup, ProductKind } from '@prisma/client';
import { Type } from 'class-transformer';
import {
	IsBoolean,
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

export class UpdateProductDto {
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	sku?: string;

	@IsOptional()
	@IsString()
	@IsNotEmpty()
	name?: string;

	@IsOptional()
	@IsString()
	barcode?: string;

	@IsOptional()
	@IsUUID('4')
	baseUnitId?: string;

	@IsOptional()
	@IsUUID('4')
	categoryId?: string | null;

	@IsOptional()
	@IsUUID('4')
	brandId?: string | null;

	@IsOptional()
	@IsUUID('4')
	manufacturerId?: string | null;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	costPrice?: number;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	salePrice?: number;

	@IsOptional()
	@Type(() => Number)
	@IsInt()
	@Min(0)
	@Max(Number.MAX_SAFE_INTEGER)
	wholesalePrice?: number | null;

	@IsOptional()
	@IsBoolean()
	isLocked?: boolean;

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
