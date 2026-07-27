import { ConversionKind } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsUUID, Min } from 'class-validator';

export class ProductConversionDto {
	@IsUUID('4')
	unitId!: string;

	@Type(() => Number)
	@IsInt()
	@Min(1)
	factor!: number;

	@IsEnum(ConversionKind)
	kind: ConversionKind = ConversionKind.BOTH;
}
