import { SaleStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SalesOrderQueryDto {
	@IsOptional() @IsString() search?: string;
	@IsOptional() @IsEnum(SaleStatus) status?: SaleStatus;
	@IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
	@IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(20) pageSize = 20;
}
